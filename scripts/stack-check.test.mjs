import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
    chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, statSync,
    symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "stack-check.mjs");
const OWNER_FILTER = "label=cinexplorer.stack-check.owner";

function startTime(pid) {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19];
}

const BOOT = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim().replaceAll("-", "").slice(0, 12);
const NAMESPACE = /\[(\d+)\]/.exec(readlinkSync("/proc/self/ns/pid"))[1];
// This test process stands in for a run that is still going.
const LIVE = `${BOOT}:${NAMESPACE}:${process.pid}:${startTime(process.pid)}`;
const DEAD = `${BOOT}:${NAMESPACE}:999999999:1`;
// Owners this process can't check count as live; owners from an earlier boot have ended.
const OTHER_NAMESPACE = `${BOOT}:1:999999999:1`;
const OTHER_BOOT = `000000000000:${NAMESPACE}:${process.pid}:${startTime(process.pid)}`;
const NOISE = "Emulate Docker CLI using podman. Create /etc/containers/nodocker to quiet msg.";

function write(root, path, contents) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
}

// Stand-ins for docker, openssl, curl and npm record each call, with the Compose env file's contents, and answer
// from CX_* settings. docker remembers the last Compose project so its image list can name it, and with
// CX_NOISE writes a podman-style notice to stderr on every call.
const STUB = `#!${process.execPath}
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
const command = basename(process.argv[1]);
const args = process.argv.slice(2);
const at = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const envFile = at('--env-file');
const state = join(process.env.CX_STATE, 'project');
if (args.includes('-p')) {
    // Replaced whole, so a stand-in reading it at the same moment never sees it empty.
    writeFileSync(state + process.pid, at('-p'));
    renameSync(state + process.pid, state);
}
const project = existsSync(state) ? readFileSync(state, 'utf8') : '';
appendFileSync(process.env.CX_TEST_LOG, JSON.stringify({
    command, args, cwd: process.cwd(), envFile: envFile && readFileSync(envFile, 'utf8'),
    env: Object.fromEntries(['COMPOSE_ENV_FILES', 'COMPOSE_FILE', 'COMPOSE_PROFILES', 'COMPOSE_PROJECT_NAME', 'E2E_BASE_URL',
        'E2E_TARGET', 'E2E_USERNAME', 'LEAK']
        .filter((key) => key in process.env).map((key) => [key, process.env[key]])),
}) + '\\n');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
if (command === 'docker' && process.env.CX_NOISE) console.error('${NOISE}');
if (process.env.CX_FAIL && [command, ...args].includes(process.env.CX_FAIL)) {
    console.error('stub command failed: ' + process.env.CX_FAIL);
    process.exit(9);
}
if (command === 'openssl' && args[0] === 'req') {
    writeFileSync(at('-keyout'), 'key');
    writeFileSync(at('-out'), 'cert');
}
if (command === 'docker' && args[0] === 'version') {
    console.log('Client:       ' + (process.env.CX_ENGINE === 'podman' ? 'Podman' : 'Docker') + ' Engine');
    if (process.env.CX_SERVER) console.log('Server:       ' + process.env.CX_SERVER);
}
if (command === 'docker' && args.includes('ls') && args.includes('-q')) {
    const filter = at('--filter');
    const listed = filter === '${OWNER_FILTER}' ? JSON.parse(process.env.CX_OWNED ?? '{}')[args[0]]
        : filter.startsWith('label=cinexplorer.stack-check.project=') ? process.env.CX_LABELLED_IMAGES?.split(' ')
        : filter.startsWith('label=com.docker.compose.project=') && args[0] === 'container'
            ? process.env.CX_PROJECT_CONTAINERS?.split(' ') : undefined;
    if (listed) console.log(listed.join('\\n'));
}
if (command === 'docker' && args.includes('ls') && args.includes('--format') && args[0] === 'image') {
    console.log((process.env.CX_IMAGES ?? '').replaceAll('{project}', project));
}
if (command === 'docker' && args[0] === 'image' && args[1] === 'rm') {
    // As Docker does: an image named twice in one call is deleted by the first reference, and the second fails.
    const ids = new Map((process.env.CX_IMAGES ?? '').replaceAll('{project}', project).split('\\n')
        .map((line) => line.trim().split(/\\s+/)).filter(([id]) => id).map(([id, repository, tag]) => [repository + ':' + tag, id]));
    const removed = new Set();
    for (const ref of args.slice(2)) {
        const id = ids.get(ref) ?? ref;
        if (removed.has(id)) {
            console.error('Error response from daemon: No such image: ' + ref);
            process.exit(1);
        }
        removed.add(id);
    }
}
if (command === 'docker' && args.includes('inspect')) {
    const labels = JSON.parse(process.env.CX_LABELS ?? '{}');
    const gone = (process.env.CX_GONE ?? '').split(' ');
    const ids = args.slice(args.indexOf('--format') + 2);
    for (const id of ids.filter((id) => !gone.includes(id))) console.log(labels[id] ?? '');
    if (ids.some((id) => gone.includes(id))) {
        console.error('Error: no such object');
        process.exit(1);
    }
}
// The test reads these files while the script runs, so each is replaced whole, never rewritten in place
const save = (file, text) => {
    writeFileSync(file + '.tmp', text);
    renameSync(file + '.tmp', file);
};
// podman's build containers: CX_BUILD_IDS, CX_BUILD_IDS_LATER from the second listing on, and any a build added,
// less those removed
const buildState = join(process.env.CX_STATE, 'builds.json');
const builds = () => existsSync(buildState) ? JSON.parse(readFileSync(buildState, 'utf8')) : { listings: 0, added: [], removed: [] };
if (command === 'docker' && args[0] === 'ps' && args.includes('--external')) {
    const known = builds();
    known.listings += 1;
    save(buildState, JSON.stringify(known));
    const later = known.listings > 1 ? process.env.CX_BUILD_IDS_LATER ?? '' : '';
    const ids = [...(process.env.CX_BUILD_IDS ?? '').split(' '), ...later.split(' '), ...known.added]
        .filter((id) => id && !known.removed.includes(id));
    if (ids.length) console.log(ids.join('\\n'));
}
if (command === 'docker' && args[0] === 'rm' && args.includes('--ignore')) {
    const known = builds();
    known.removed.push(...args.filter((arg) => !arg.startsWith('-') && arg !== 'rm'));
    save(buildState, JSON.stringify(known));
}
if (command === 'docker' && args[0] === 'info') {
    const storage = process.env.CX_STORAGE;
    console.log(JSON.stringify({ graphRoot: storage, runRoot: storage + '-run', graphDriverName: process.env.CX_DRIVER ?? 'overlay',
        transientStore: process.env.CX_TRANSIENT === '1' }));
}
// CX_BUILDING="<container> <layer>": the stack's build adds that container, recorded for this run, and Compose runs as
// a separate process under this command, as podman's compose command runs it
if (command === 'docker' && args.includes('up') && process.env.CX_BUILDING) {
    const [id, layer] = process.env.CX_BUILDING.split(' ');
    const owner = /^STACK_CHECK_OWNER=(.*)$/m.exec(readFileSync(envFile, 'utf8'))[1];
    const folder = join(process.env.CX_STORAGE, 'overlay-containers');
    mkdirSync(join(folder, id, 'userdata'), { recursive: true });
    writeFileSync(join(folder, id, 'userdata', 'buildah.json'), JSON.stringify({ Args: { STACK_CHECK_PROJECT: project, STACK_CHECK_OWNER: owner } }));
    const store = join(folder, 'volatile-containers.json');
    writeFileSync(store, JSON.stringify([...(existsSync(store) ? JSON.parse(readFileSync(store, 'utf8')) : []), { id, layer }]));
    const known = builds();
    known.added.push(id);
    save(buildState, JSON.stringify(known));
    const provider = spawn('sleep', ['600'], { stdio: 'ignore' });
    save(join(process.env.CX_STATE, 'provider.pid'), String(provider.pid));
    await sleep(600000);
}
if (command === 'docker' && args[0] === 'stats') {
    // Sampling starts before the stack does, so the run's name comes from its folder.
    const runs = join(process.env.STACK_CHECK_SHARED, 'runs');
    const run = existsSync(runs) ? readdirSync(runs)[0] ?? '' : '';
    console.log((process.env.CX_STATS ?? '').replaceAll('{project}', run));
}
if (command === 'docker' && args.includes('exec') && args.includes('pytest')) {
    writeFileSync(join(process.env.CX_STATE, 'pytest.pid'), String(process.pid));
    await sleep(Number(process.env.CX_PYTEST_SLEEP ?? 300));
    process.exit(Number(process.env.CX_PYTEST_EXIT ?? 0));
}
if (command === 'npm' && args.includes('test:e2e')) process.exit(Number(process.env.CX_E2E_EXIT ?? 0));
`;

const PLAYWRIGHT = `export const chromium = {
    async launch() {
        const missing = process.env.CX_MISSING_LIBS;
        if (missing) {
            throw new Error("Host system is missing dependencies to run browsers. Missing libraries:\\n    " +
                missing.split(" ").join("\\n    "));
        }
        return { close: async () => {} };
    },
};
`;

function fixture(t) {
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "cx-stack-check-")));
    t.after(() => rmSync(parent, { recursive: true, force: true }));
    const root = join(parent, "checkout");
    for (const file of ["docker-compose.yml", "docker-compose.worktree.yml", "docker-compose.run.yml"]) {
        write(root, `infrastructure/${file}`, "services: {}\n");
    }
    write(root, "infrastructure/dev-certs/localhost.cnf", "[req]\n");
    write(root, "infrastructure/.env", "COMPOSE_PROJECT_NAME=cinexplorer-dev\nLEAK=checkout-value\n");
    write(root, "backend/config/.env", "TMDB_READ_ACCESS_TOKEN=real-token\n");
    write(root, "frontend/node_modules/@playwright/test/package.json",
        JSON.stringify({ name: "@playwright/test", type: "module", exports: "./index.js" }));
    write(root, "frontend/node_modules/@playwright/test/index.js", PLAYWRIGHT);
    const bin = join(parent, "bin");
    const runtime = join(parent, "runtime");
    const temp = join(parent, "temp");
    const stateDir = join(parent, "state");
    for (const folder of [bin, runtime, temp, stateDir]) mkdirSync(folder);
    for (const command of ["docker", "openssl", "curl", "npm"]) writeFileSync(join(bin, command), STUB, { mode: 0o755 });
    write(root, "frontend/node_modules/.bin/playwright", STUB);
    spawnSync("chmod", ["755", join(root, "frontend/node_modules/.bin/playwright")]);
    const log = join(parent, "calls.jsonl");
    // The folder every run shares, moved out of /tmp so tests never touch real runs' claims
    const shared = join(parent, "shared");
    const claims = join(shared, "claims");
    const runs = join(shared, "runs");
    // podman's container storage, and the mount tables of the test's stand-in build runtimes
    const storage = join(parent, "container storage");
    const mounts = join(parent, "mounts");
    mkdirSync(mounts);
    function environment(env) {
        return {
            ...process.env, PATH: `${bin}:${process.env.PATH}`, CX_TEST_LOG: log, CX_STATE: stateDir,
            STACK_CHECK_SHARED: shared, XDG_RUNTIME_DIR: runtime, TMPDIR: temp, COMPOSE_PROFILES: "browser",
            LEAK: "shell-value", CX_STORAGE: storage, STACK_CHECK_MOUNTS: mounts, ...env,
        };
    }
    function invoke(args, env = {}) {
        return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, env: environment(env), encoding: "utf8" });
    }
    function launch(args, env = {}) {
        return spawn(process.execPath, [SCRIPT, ...args], { cwd: root, env: environment(env), stdio: ["ignore", "pipe", "pipe"] });
    }
    function calls() {
        return existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
    }
    function buildsLeft() {
        const state = join(stateDir, "builds.json");
        const { added, removed } = existsSync(state) ? JSON.parse(readFileSync(state, "utf8")) : { added: [], removed: [] };
        return { added, removed };
    }
    return { parent, root, runtime, temp, stateDir, shared, claims, runs, storage, mounts, invoke, launch, calls, buildsLeft };
}

function compose(calls, verb) {
    return calls.filter((call) => call.command === "docker" && call.args[0] === "compose" && call.args.includes(verb));
}

function projectOf(call) {
    return call.args[call.args.indexOf("-p") + 1];
}

function claimName(port, owner) {
    return `${port}_${owner.replaceAll(":", "_")}`;
}

function lastLine(text) {
    return text.trim().split("\n").at(-1);
}

function removals(calls) {
    return calls.filter((call) => call.command === "docker" && call.args.includes("ls") && call.args.includes("-q") &&
        call.args.some((arg) => arg.startsWith("label=com.docker.compose.project=")))
        .map((call) => call.args.at(-1).split("=").at(-1));
}

async function until(check, timeout = 10000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
        if (check()) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail("timed out waiting");
}

test("reports that nothing ran when no container engine answers", (t) => {
    const f = fixture(t);
    const result = f.invoke(["backend"], { CX_FAIL: "version" });
    assert.equal(result.status, 75, result.stdout + result.stderr);
    assert.match(result.stderr, /^stack-check: .*engine/m);
    assert.equal(compose(f.calls(), "up").length, 0);
});

test("runs pytest in a throwaway stack, removes the stack and returns pytest's status", (t) => {
    const f = fixture(t);
    const result = f.invoke(["backend", "apps/users/", "-x"], { CX_PYTEST_EXIT: "3" });
    assert.equal(result.status, 3, result.stdout + result.stderr);
    const calls = f.calls();
    const [up] = compose(calls, "up");
    const project = projectOf(up);
    assert.match(project, /^cinexplorer-run-85\d\d-[0-9a-f]{6}$/);
    for (const file of ["docker-compose.yml", "docker-compose.worktree.yml", "docker-compose.run.yml"]) {
        assert.ok(up.args.includes(`infrastructure/${file}`), file);
    }
    assert.deepEqual(up.args.slice(up.args.indexOf("up")), ["up", "-d", "--build", "--wait", "--quiet-pull", "dev-db", "redis", "backend"]);
    const [exec] = compose(calls, "exec");
    assert.deepEqual(exec.args.slice(exec.args.indexOf("exec")),
        ["exec", "-T", "backend", "pytest", "-p", "no:cacheprovider", "apps/users/", "-x"]);
    assert.ok(calls.indexOf(exec) > calls.indexOf(up));
    assert.deepEqual(removals(calls), [project, project, project]);
    assert.deepEqual(readdirSync(f.claims), []);
    assert.deepEqual(readdirSync(f.runs), []);
});

test("never writes the checkout's env files, and keeps them and shell settings out of Compose's settings", (t) => {
    const f = fixture(t);
    const files = ["infrastructure/.env", "backend/config/.env"];
    const before = files.map((file) => [readFileSync(join(f.root, file), "utf8"), statSync(join(f.root, file)).mtimeMs]);
    const result = f.invoke(["backend"]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(files.map((file) => [readFileSync(join(f.root, file), "utf8"), statSync(join(f.root, file)).mtimeMs]), before);
    const [up] = compose(f.calls(), "up");
    const envFile = up.args[up.args.indexOf("--env-file") + 1];
    assert.equal(envFile, join(f.runs, projectOf(up), "compose.env"));
    assert.match(up.envFile, new RegExp(`^COMPOSE_PROJECT_NAME=${projectOf(up)}$`, "m"));
    assert.match(up.envFile, /^STACK_CHECK_DIR=.+$/m);
    assert.doesNotMatch(up.envFile, /LEAK|cinexplorer-dev/);
    assert.deepEqual(up.env, { LEAK: "shell-value" });
});

test("runs podman's containers as the host user", (t) => {
    const f = fixture(t);
    assert.equal(f.invoke(["backend"], { CX_ENGINE: "podman" }).status, 0);
    const [podman] = compose(f.calls(), "up");
    assert.match(podman.envFile, /^USERNS_MODE=keep-id$/m);
    assert.match(podman.envFile, new RegExp(`^USER_UID=${process.getuid()}$`, "m"));
    const s = fixture(t);
    assert.equal(s.invoke(["backend"], { CX_ENGINE: "docker", CX_SERVER: "Podman Engine" }).status, 0);
    assert.match(compose(s.calls(), "up")[0].envFile, /^USERNS_MODE=keep-id$/m);
    const g = fixture(t);
    assert.equal(g.invoke(["backend"], { CX_ENGINE: "docker" }).status, 0);
    const [docker] = compose(g.calls(), "up");
    assert.doesNotMatch(docker.envFile, /USERNS_MODE/);
    assert.match(docker.envFile, new RegExp(`^USER_GID=${process.getgid()}$`, "m"));
});

test("takes a port no live run holds and clears claims whose run is gone", (t) => {
    const f = fixture(t);
    mkdirSync(f.claims, { recursive: true });
    const live = claimName(8500, LIVE);
    const elsewhere = claimName(8501, OTHER_NAMESPACE);
    writeFileSync(join(f.claims, live), "");
    writeFileSync(join(f.claims, elsewhere), "");
    writeFileSync(join(f.claims, claimName(8502, DEAD)), "");
    const result = f.invoke(["backend"]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(projectOf(compose(f.calls(), "up")[0]), /^cinexplorer-run-8502-/);
    assert.deepEqual(readdirSync(f.claims).sort(), [live, elsewhere]);
});

// A directory another account owns: root's, unless the tests run as root
function othersFolder(t) {
    if (statSync("/").uid !== process.getuid()) return ["/"];
    t.diagnostic("no directory another account owns, so that case is skipped");
    return [];
}

test("refuses a shared folder that isn't this account's own directory, before running anything", (t) => {
    const f = fixture(t);
    const target = join(f.parent, "target");
    mkdirSync(target);
    const link = join(f.parent, "link");
    symlinkSync(target, link);
    const file = join(f.parent, "file");
    writeFileSync(file, "");
    const broken = join(f.parent, "broken");
    symlinkSync(join(f.parent, "missing"), broken);
    for (const shared of [link, file, broken, ...othersFolder(t)]) {
        const result = f.invoke(["backend"], { STACK_CHECK_SHARED: shared });
        assert.equal(result.status, 75, result.stdout + result.stderr);
        assert.equal(lastLine(result.stderr), `stack-check: ${shared} must be a directory this account owns`);
    }
    assert.deepEqual(f.calls().filter((call) => call.command === "docker"), []);
    assert.deepEqual(readdirSync(target), []);
    assert.equal(existsSync(join(f.parent, "missing")), false);
});

test("won't tear down through a shared folder that isn't this account's own directory", (t) => {
    const f = fixture(t);
    const target = join(f.parent, "target");
    const project = "cinexplorer-run-8500-abcdef";
    write(target, `runs/${project}/owner`, DEAD);
    const link = join(f.parent, "link");
    symlinkSync(target, link);
    const broken = join(f.parent, "broken");
    symlinkSync(join(f.parent, "missing"), broken);
    for (const shared of [link, broken, ...othersFolder(t)]) {
        const result = f.invoke(["--tear-down", project], { STACK_CHECK_SHARED: shared });
        assert.equal(result.status, 75, result.stdout + result.stderr);
        assert.equal(lastLine(result.stderr), `stack-check: ${shared} must be a directory this account owns`);
    }
    assert.ok(existsSync(join(target, "runs", project, "owner")));
    assert.equal(existsSync(join(f.parent, "missing")), false);
    assert.deepEqual(f.calls().filter((call) => call.command === "docker"), []);
});

test("keeps the shared folder private, closing one left open", (t) => {
    const f = fixture(t);
    const mode = () => statSync(f.shared).mode & 0o777;
    assert.equal(f.invoke(["backend"]).status, 0);
    assert.equal(mode(), 0o700);
    chmodSync(f.shared, 0o755);
    assert.equal(f.invoke(["backend"]).status, 0);
    assert.equal(mode(), 0o700);
});

test("keeps the shared folder under /tmp for the account, with XDG_RUNTIME_DIR set elsewhere or unset", (t) => {
    const f = fixture(t);
    // The real folder every run on this machine uses. The test works there only on a project of its own that no run can
    // have (ports start at 8500), and afterward removes only that project's folder: the shared folder stays, as after
    // any run, since a real run may be using it.
    const runs = join("/tmp", `cinexplorer-stack-check-${process.getuid()}`, "runs");
    const project = `cinexplorer-run-0000-${randomBytes(3).toString("hex")}`;
    t.after(() => rmSync(join(runs, project), { recursive: true, force: true }));
    for (const runtime of [f.runtime, undefined]) {
        mkdirSync(join(runs, project), { recursive: true, mode: 0o700 });
        const result = f.invoke(["--tear-down", project], { STACK_CHECK_SHARED: undefined, XDG_RUNTIME_DIR: runtime });
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.equal(existsSync(join(runs, project)), false);
    }
    assert.deepEqual(readdirSync(f.runtime), []);
    assert.deepEqual(readdirSync(f.temp), []);
});

test("reports that nothing ran when every port is claimed", (t) => {
    const f = fixture(t);
    mkdirSync(f.claims, { recursive: true });
    for (let port = 8500; port <= 8599; port++) writeFileSync(join(f.claims, claimName(port, LIVE)), "");
    const result = f.invoke(["backend"]);
    assert.equal(result.status, 75, result.stdout + result.stderr);
    assert.equal(lastLine(result.stderr), "stack-check: no free port from 8500 to 8599");
    assert.equal(compose(f.calls(), "up").length, 0);
});

test("removes stacks whose run is gone and leaves live runs and other stacks alone", (t) => {
    const f = fixture(t);
    const folder = (project, owner) => write(f.runs, `${project}/owner`, owner);
    folder("cinexplorer-run-8594-dead03", DEAD);
    folder("cinexplorer-run-8595-e15e00", OTHER_NAMESPACE);
    const result = f.invoke(["backend"], {
        CX_NOISE: "1",
        CX_OWNED: JSON.stringify({ container: ["dead1", "live1", "gone1", "away1"], volume: ["deadvolume"], image: ["deadimage"] }),
        CX_GONE: "gone1",
        CX_LABELS: JSON.stringify({
            dead1: `${DEAD} cinexplorer-run-8590-dead00`,
            live1: `${LIVE} cinexplorer-run-8591-11fe00`,
            away1: `${OTHER_NAMESPACE} cinexplorer-run-8596-a0a000`,
            deadvolume: `${OTHER_BOOT} cinexplorer-run-8592-dead01`,
            deadimage: `${DEAD} cinexplorer-run-8593-dead02`,
        }),
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const calls = f.calls();
    const listings = calls.filter((call) => call.args.includes("ls") && call.args.includes(OWNER_FILTER));
    assert.deepEqual(listings.map((call) => call.args[0]).sort(), ["container", "image", "network", "volume"]);
    const own = projectOf(compose(calls, "up")[0]);
    const swept = [...new Set(removals(calls).filter((project) => project !== own))].sort();
    assert.deepEqual(swept, ["cinexplorer-run-8590-dead00", "cinexplorer-run-8592-dead01", "cinexplorer-run-8593-dead02",
        "cinexplorer-run-8594-dead03"]);
    assert.ok(calls.indexOf(compose(calls, "up")[0]) > calls.findLastIndex((call) => swept.includes(call.args.at(-1).split("=").at(-1))));
    assert.ok(!calls.some((call) => call.args.join(" ").includes("Emulate")), "engine notices taken for resources");
    assert.deepEqual(readdirSync(f.runs), ["cinexplorer-run-8595-e15e00"]);
});

test("removes the run's built images by its label and by the names Compose gives them", (t) => {
    const f = fixture(t);
    const result = f.invoke(["backend"], {
        CX_LABELLED_IMAGES: "labelled1",
        CX_IMAGES: "id1 docker.io/library/{project}-backend latest\nid2 localhost/{project}-frontend latest\n" +
            "id3 docker.io/library/cinexplorer-main-backend latest\nid4 docker.io/library/{project}-backend-extra latest",
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const calls = f.calls();
    const project = projectOf(compose(calls, "up")[0]);
    const removed = calls.filter((call) => call.command === "docker" && call.args[0] === "image" && call.args[1] === "rm");
    assert.equal(removed.length, 1);
    assert.deepEqual(removed[0].args.slice(2).sort(),
        ["docker.io/library/" + project + "-backend:latest", "labelled1", "localhost/" + project + "-frontend:latest"]);
});

test("removes an image its label and its name both find only once, so Docker reports a clean teardown", (t) => {
    const f = fixture(t);
    const result = f.invoke(["backend"], {
        CX_LABELLED_IMAGES: "id1 id2",
        CX_IMAGES: "id1 docker.io/library/{project}-backend latest\nid2 docker.io/library/{project}-frontend latest",
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const project = projectOf(compose(f.calls(), "up")[0]);
    const removed = f.calls().filter((call) => call.command === "docker" && call.args[0] === "image" && call.args[1] === "rm");
    assert.deepEqual(removed.map((call) => call.args.slice(2).sort()),
        [[`docker.io/library/${project}-backend:latest`, `docker.io/library/${project}-frontend:latest`]]);
    assert.match(result.stdout, /^stack-check: removed the stack in \d+ s$/m);
    assert.doesNotMatch(result.stdout, /couldn't remove/);
});

test("says what it couldn't remove, and still returns the check's status", (t) => {
    const f = fixture(t);
    const result = f.invoke(["backend"], { CX_PROJECT_CONTAINERS: "c1", CX_FAIL: "rm" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const project = projectOf(compose(f.calls(), "up")[0]);
    assert.match(result.stdout, new RegExp(`^stack-check: couldn't remove all of ${project}: containers: stub command failed: rm$`, "m"));
    assert.doesNotMatch(result.stdout, /removed the stack/);
    assert.match(lastLine(result.stdout), /^stack-check: peak memory /);
});

// A build's working container: buildah's record of its build arguments, and its entry in podman's volatile container
// store, which names the layer it is mounted on
function buildContainer(f, name, args, { listed = true, driver = "overlay", root = f.storage } = {}) {
    const id = name.repeat(64 / name.length);
    const layer = `layer${name}`;
    write(root, `${driver}-containers/${id}/userdata/buildah.json`, JSON.stringify({ Args: args }));
    const store = join(root, `${driver}-containers`, "volatile-containers.json");
    const entries = existsSync(store) ? JSON.parse(readFileSync(store, "utf8")) : [];
    if (listed) writeFileSync(store, JSON.stringify([...entries, { id, names: [`${name}-working-container`], layer }]));
    return { id, layer };
}

// A build runtime at work: a real process named as buildah's runtime (unless named otherwise), in its own bundle
// folder, running a step that the bundle's pid file names and a short-lived helper beside it, with the given layer
// mounted as the step's root in its mount table.
async function buildRuntime(t, f, layer, name = "buildah-oci-runtime") {
    const bundle = mkdtempSync(join(f.parent, "buildah"));
    const runtime = spawn("bash", ["-c", `exec -a ${name} bash -c 'sleep 600 & echo $! > pid; sleep 600 & echo $! > helper; wait'`],
        { cwd: bundle, stdio: "ignore", detached: true });
    t.after(() => {
        try {
            process.kill(-runtime.pid, "SIGKILL");
        } catch {
            // Ended already
        }
    });
    const read = (file) => existsSync(join(bundle, file)) ? Number(readFileSync(join(bundle, file), "utf8").trim()) : 0;
    await until(() => read("pid") && read("helper"));
    const storage = f.storage.replaceAll(" ", "\\040");
    write(f.mounts, `${runtime.pid}/mountinfo`, "1869 1706 0:153 / / rw - overlay overlay rw,upperdir=/elsewhere/diff\n" +
        `2122 2120 0:277 / ${bundle}/mnt/rootfs rw,nodev,relatime - overlay overlay rw,lowerdir=${storage}/overlay/l/diff,` +
        `upperdir=${storage}/overlay/${layer}/diff,workdir=${storage}/overlay/${layer}/work\n`);
    return { bundle, runtime: runtime.pid, step: read("pid"), helper: read("helper") };
}

// Read from the process table, where a process killed but not yet collected by its parent counts as ended
function running(pid) {
    try {
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        return !stat.slice(stat.lastIndexOf(")") + 2).startsWith("Z");
    } catch {
        return false;
    }
}

function removedBuilds(f) {
    return f.calls().filter((call) => call.command === "docker" && call.args[0] === "rm").map((call) => call.args.slice(3));
}

const RUN = "cinexplorer-run-8500-abcdef";

test("stops only a run's own running build step, and removes only its build containers", async (t) => {
    const f = fixture(t);
    const building = buildContainer(f, "a", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD, USER_UID: "1000" });
    // An earlier stage of the same build, with no step running
    const stage = buildContainer(f, "b", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD });
    // The same project under a live owner isn't this run's
    const borrowed = buildContainer(f, "c", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: LIVE });
    const theirs = buildContainer(f, "d", { STACK_CHECK_PROJECT: "cinexplorer-run-8501-0f0f0f", STACK_CHECK_OWNER: DEAD });
    const unnamed = buildContainer(f, "e", { USER_UID: "1000" });
    const step = await buildRuntime(t, f, building.layer);
    const borrowedStep = await buildRuntime(t, f, borrowed.layer);
    const theirStep = await buildRuntime(t, f, theirs.layer);
    // Not buildah's runtime, though it has the run's layer mounted
    const other = await buildRuntime(t, f, building.layer, "conmon");
    // A runtime whose pid file names a process that isn't its child
    const stale = await buildRuntime(t, f, building.layer);
    writeFileSync(join(stale.bundle, "pid"), String(other.step));
    // A container that isn't a build's has no record
    const ids = [building, stage, borrowed, theirs, unnamed].map(({ id }) => id).concat("f".repeat(64));
    const result = f.invoke(["--tear-down", RUN], { CX_ENGINE: "podman", CX_BUILD_IDS: ids.join(" ") });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(lastLine(result.stdout), `stack-check: removed ${RUN}`);
    assert.equal(running(step.step), false);
    for (const pid of [step.helper, borrowedStep.step, theirStep.step, other.step, stale.step]) assert.ok(running(pid), String(pid));
    assert.deepEqual(removedBuilds(f), [[building.id, stage.id]]);
});

test("takes the run's owner from its folder", async (t) => {
    const f = fixture(t);
    write(f.runs, `${RUN}/owner`, LIVE);
    const mine = buildContainer(f, "a", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: LIVE });
    const ended = buildContainer(f, "b", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD });
    const step = await buildRuntime(t, f, mine.layer);
    const endedStep = await buildRuntime(t, f, ended.layer);
    const result = f.invoke(["--tear-down", RUN], { CX_ENGINE: "podman", CX_BUILD_IDS: `${mine.id} ${ended.id}` });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(running(step.step), false);
    assert.ok(running(endedStep.step));
    assert.deepEqual(removedBuilds(f), [[mine.id]]);
});

test("removes a build container its run's build adds as it stops", async (t) => {
    const f = fixture(t);
    const building = buildContainer(f, "a", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD });
    const added = buildContainer(f, "b", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD });
    const step = await buildRuntime(t, f, building.layer);
    const result = f.invoke(["--tear-down", RUN], { CX_ENGINE: "podman", CX_BUILD_IDS: building.id, CX_BUILD_IDS_LATER: added.id });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(lastLine(result.stdout), `stack-check: removed ${RUN}`);
    assert.equal(running(step.step), false);
    assert.deepEqual(removedBuilds(f), [[building.id, added.id]]);
});

test("a teardown after a cancel looks again for a build that hadn't added a container yet", (t) => {
    const f = fixture(t);
    const added = buildContainer(f, "a", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD });
    const result = f.invoke(["--tear-down", RUN], { CX_ENGINE: "podman", CX_BUILD_IDS_LATER: added.id });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(removedBuilds(f), [[added.id]]);
});

test("says what it couldn't read, and still stops and removes what it could", async (t) => {
    const f = fixture(t);
    const unreadable = buildContainer(f, "a", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD });
    write(f.storage, `overlay-containers/${unreadable.id}/userdata/buildah.json`, "{");
    const unlisted = buildContainer(f, "b", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD }, { listed: false });
    const building = buildContainer(f, "c", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD });
    const step = await buildRuntime(t, f, building.layer);
    // A runtime whose mount table can't be read
    const hidden = await buildRuntime(t, f, "layerz");
    rmSync(join(f.mounts, String(hidden.runtime), "mountinfo"));
    mkdirSync(join(f.mounts, String(hidden.runtime), "mountinfo"));
    const result = f.invoke(["--tear-down", RUN], { CX_ENGINE: "podman",
        CX_BUILD_IDS: [unreadable, unlisted, building].map(({ id }) => id).join(" ") });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(lastLine(result.stdout), `stack-check: couldn't remove all of ${RUN}: ` +
        "build containers: couldn't read the record of aaaaaaaaaaaa; build steps: couldn't tell which are bbbbbbbbbbbb's; " +
        `build steps: couldn't read the mounts of build runtime ${hidden.runtime}`);
    assert.equal(running(step.step), false);
    assert.ok(running(hidden.step));
    assert.deepEqual(removedBuilds(f), [[unlisted.id, building.id]]);
});

test("finds a transient store's build containers under podman's run root", async (t) => {
    const f = fixture(t);
    const building = buildContainer(f, "a", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD }, { root: `${f.storage}-run` });
    const step = await buildRuntime(t, f, building.layer);
    const result = f.invoke(["--tear-down", RUN], { CX_ENGINE: "podman", CX_TRANSIENT: "1", CX_BUILD_IDS: building.id });
    assert.equal(lastLine(result.stdout), `stack-check: removed ${RUN}`);
    assert.equal(running(step.step), false);
    assert.deepEqual(removedBuilds(f), [[building.id]]);
});

test("says it can't find steps on storage other than overlay, and still removes the build", (t) => {
    const f = fixture(t);
    const building = buildContainer(f, "a", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD }, { driver: "vfs" });
    const result = f.invoke(["--tear-down", RUN], { CX_ENGINE: "podman", CX_DRIVER: "vfs", CX_BUILD_IDS: building.id });
    assert.equal(lastLine(result.stdout), `stack-check: couldn't remove all of ${RUN}: build steps: can't find steps on vfs storage`);
    assert.deepEqual(removedBuilds(f), [[building.id]]);
});

test("a check stops and removes builds left by runs that ended, and leaves live runs' builds", async (t) => {
    const f = fixture(t);
    const ended = buildContainer(f, "a", { STACK_CHECK_PROJECT: "cinexplorer-run-8597-dead04", STACK_CHECK_OWNER: DEAD });
    const live = buildContainer(f, "b", { STACK_CHECK_PROJECT: "cinexplorer-run-8596-11fe00", STACK_CHECK_OWNER: LIVE });
    const unreadable = buildContainer(f, "c", { STACK_CHECK_PROJECT: "cinexplorer-run-8595-c0ffee", STACK_CHECK_OWNER: DEAD });
    write(f.storage, `overlay-containers/${unreadable.id}/userdata/buildah.json`, "{");
    const endedStep = await buildRuntime(t, f, ended.layer);
    const liveStep = await buildRuntime(t, f, live.layer);
    const result = f.invoke(["backend"], { CX_ENGINE: "podman", CX_BUILD_IDS: [ended, live, unreadable].map(({ id }) => id).join(" ") });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /^stack-check: couldn't check every build for runs that ended: build containers: couldn't read the record of cccccccccccc$/m);
    assert.match(result.stdout, /^stack-check: couldn't remove all of cinexplorer-run-8597-dead04: build containers: couldn't read the record of cccccccccccc$/m);
    assert.equal(running(endedStep.step), false);
    assert.ok(running(liveStep.step));
    assert.deepEqual(removedBuilds(f), [[ended.id]]);
});

test("a cancel during a podman build ends the build's step and the Compose process under podman's command", async (t) => {
    const f = fixture(t);
    const step = await buildRuntime(t, f, "layerc");
    const run = f.launch(["backend"], { CX_ENGINE: "podman", CX_BUILDING: `${"c".repeat(64)} layerc` });
    const providerFile = join(f.stateDir, "provider.pid");
    await until(() => existsSync(providerFile));
    const provider = Number(readFileSync(providerFile, "utf8"));
    t.after(() => {
        if (running(provider)) process.kill(provider, "SIGKILL");
    });
    run.kill("SIGTERM");
    await new Promise((resolve) => run.once("exit", resolve));
    await until(() => !running(provider) && !running(step.step) && f.buildsLeft().removed.includes("c".repeat(64)));
    assert.ok(running(step.helper));
});

test("leaves image builds to Docker, and says a Docker client on podman's service can't stop podman's", async (t) => {
    const f = fixture(t);
    const building = buildContainer(f, "a", { STACK_CHECK_PROJECT: RUN, STACK_CHECK_OWNER: DEAD });
    const step = await buildRuntime(t, f, building.layer);
    const docker = f.invoke(["--tear-down", RUN], { CX_BUILD_IDS: building.id });
    assert.equal(lastLine(docker.stdout), `stack-check: removed ${RUN}`);
    const service = f.invoke(["--tear-down", RUN], { CX_BUILD_IDS: building.id, CX_SERVER: "Podman Engine" });
    assert.equal(lastLine(service.stdout), `stack-check: couldn't remove all of ${RUN}: builds: only podman's own command can find podman's builds`);
    assert.ok(running(step.step));
    assert.equal(f.calls().filter((call) => call.args.includes("--external")).length, 0);
});

test("says when a teardown can't tell the engine", (t) => {
    const f = fixture(t);
    const result = f.invoke(["--tear-down", RUN], { CX_FAIL: "version" });
    assert.equal(lastLine(result.stdout), `stack-check: couldn't remove all of ${RUN}: builds: couldn't tell the engine: stub command failed: version`);
});

test("the stack's Compose files give both builds their run's owner and project", (t) => {
    if (spawnSync("docker", ["compose", "version"]).status !== 0) {
        t.skip("Compose isn't installed");
        return;
    }
    const f = fixture(t);
    const repository = dirname(dirname(SCRIPT));
    write(f.parent, "run/compose.env", `SITE_PORT=8599\nWORKTREE_SECRET_KEY=x\nSTACK_CHECK_OWNER=${DEAD}\n` +
        `STACK_CHECK_DIR=${join(f.parent, "run")}\nUSER_UID=1000\nUSER_GID=1000\nUSERNS_MODE=keep-id\n`);
    write(f.parent, "run/backend.env", "");
    const rendered = spawnSync("docker", ["compose", "-p", RUN, "--env-file", join(f.parent, "run/compose.env"),
        ...["docker-compose.yml", "docker-compose.worktree.yml", "docker-compose.run.yml"].flatMap((file) => ["-f", `infrastructure/${file}`]),
        "--profile", "browser", "config", "--format", "json"], { cwd: repository, encoding: "utf8" });
    if (rendered.status !== 0) {
        t.skip(`Compose couldn't render the files here: ${lastLine(rendered.stderr)}`);
        return;
    }
    const { services } = JSON.parse(rendered.stdout.slice(rendered.stdout.indexOf("{")));
    for (const service of ["backend", "frontend"]) {
        assert.equal(services[service].build.args.STACK_CHECK_OWNER, DEAD, service);
        assert.equal(services[service].build.args.STACK_CHECK_PROJECT, RUN, service);
    }
});

test("refuses to tear down anything but a stack-check project", (t) => {
    const f = fixture(t);
    for (const project of ["cinexplorer-dev", "cinexplorer-browse-restore-depth", "/"]) {
        const result = f.invoke(["--tear-down", project]);
        assert.equal(result.status, 64, project);
        assert.match(result.stderr, /--tear-down takes a stack-check project/);
    }
    assert.deepEqual(f.calls(), []);
});

test("tears the stack down in the background when cancelled", async (t) => {
    const f = fixture(t);
    const child = f.launch(["backend"], { CX_PYTEST_SLEEP: "20000" });
    const exited = new Promise((resolve) => child.on("exit", (code, signal) => resolve({ code, signal })));
    await until(() => compose(f.calls(), "exec").length === 1);
    const project = projectOf(compose(f.calls(), "up")[0]);
    const sent = Date.now();
    child.kill("SIGTERM");
    const { code } = await exited;
    assert.equal(code, 143);
    assert.ok(Date.now() - sent < 2000, `exit took ${Date.now() - sent} ms`);
    assert.deepEqual(readdirSync(f.claims), []);
    // The run's own processes stop with it.
    const pytest = Number(readFileSync(join(f.stateDir, "pytest.pid"), "utf8"));
    await until(() => {
        try {
            process.kill(pytest, 0);
            return false;
        } catch {
            return true;
        }
    }, 3000);
    await until(() => removals(f.calls()).length === 3 && readdirSync(f.runs).length === 0);
    assert.deepEqual(removals(f.calls()), [project, project, project]);
});

test("ends with the stack's peak memory", (t) => {
    const f = fixture(t);
    const result = f.invoke(["backend"], {
        CX_STATS: "{project}-backend-1\t512MiB / 1GiB\n{project}-dev-db-1\t100MB / 512MB\ncinexplorer-other-backend-1\t9GiB / 10GiB",
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout.trim().split("\n").at(-1), /^stack-check: peak memory 607 MiB \(stack 607 MiB\)$/);
});

test("stops before building when Chromium can't start, naming what it lacks", (t) => {
    const f = fixture(t);
    const result = f.invoke(["e2e"], { CX_MISSING_LIBS: "libatk-1.0.so.0 libcups.so.2" });
    assert.equal(result.status, 75, result.stdout + result.stderr);
    assert.match(result.stderr, /^stack-check: .*libatk-1\.0\.so\.0, libcups\.so\.2$/m);
    assert.equal(compose(f.calls(), "up").length, 0);
    assert.ok(f.calls().some((call) => call.command === "playwright" && call.args.join(" ") === "install chromium"));
});

test("runs the end-to-end specs against the stack's own port", (t) => {
    const f = fixture(t);
    const result = f.invoke(["e2e", "back-to-results.spec.ts"], { CX_E2E_EXIT: "1", E2E_USERNAME: "someone", E2E_TARGET: "staging" });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const calls = f.calls();
    const [up] = compose(calls, "up");
    const port = /^cinexplorer-run-(\d+)-/.exec(projectOf(up))[1];
    assert.deepEqual(up.args.slice(up.args.indexOf("--profile")), ["--profile", "browser", "up", "-d", "--build", "--wait", "--quiet-pull"]);
    const steps = compose(calls, "exec").map((call) => call.args.slice(call.args.indexOf("manage.py") + 1)[0]);
    assert.deepEqual(steps, ["migrate", "seed_dev_data"]);
    const curl = calls.find((call) => call.command === "curl" && call.args.includes("--retry"));
    assert.equal(curl.args.at(-1), `https://localhost:${port}/`);
    const specs = calls.find((call) => call.command === "npm");
    assert.deepEqual(specs.args, ["run", "test:e2e", "--", "back-to-results.spec.ts"]);
    assert.equal(specs.cwd, join(f.root, "frontend"));
    // Specs that reach into the stack themselves find it through Compose's own settings.
    assert.deepEqual(specs.env, {
        COMPOSE_ENV_FILES: up.args[up.args.indexOf("--env-file") + 1],
        COMPOSE_FILE: "infrastructure/docker-compose.yml:infrastructure/docker-compose.worktree.yml:infrastructure/docker-compose.run.yml",
        COMPOSE_PROJECT_NAME: projectOf(up),
        E2E_BASE_URL: `https://localhost:${port}`, E2E_TARGET: "local", LEAK: "shell-value",
    });
    assert.ok(calls.indexOf(curl) > calls.indexOf(compose(calls, "exec").at(-1)) && calls.indexOf(specs) > calls.indexOf(curl));
    assert.equal(removals(calls).length, 3);
});

test("fails when the stack doesn't start, showing why, and still removes it", (t) => {
    const f = fixture(t);
    const result = f.invoke(["backend"], { CX_FAIL: "up" });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /stub command failed: up/);
    assert.match(result.stderr, /^stack-check: the stack didn't start$/m);
    assert.equal(compose(f.calls(), "logs").length, 1);
    assert.equal(compose(f.calls(), "exec").length, 0);
    assert.equal(removals(f.calls()).length, 3);
    assert.match(lastLine(result.stdout), /^stack-check: peak memory /);
});

test("refuses an unknown check", (t) => {
    const f = fixture(t);
    const result = f.invoke(["frontend"]);
    assert.equal(result.status, 64);
    assert.match(result.stderr, /Usage: node scripts\/stack-check\.mjs backend\|e2e/);
    assert.deepEqual(f.calls(), []);
});
