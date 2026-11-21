import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
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
import { appendFileSync, existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
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
if (command === 'docker' && args[0] === 'stats') {
    // Sampling starts before the stack does, so the run's name comes from its folder.
    const runs = join(process.env.XDG_RUNTIME_DIR, 'cinexplorer-stack-check/runs');
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
    const claims = join(runtime, "cinexplorer-stack-check/claims");
    const runs = join(runtime, "cinexplorer-stack-check/runs");
    function environment(env) {
        return {
            ...process.env, PATH: `${bin}:${process.env.PATH}`, CX_TEST_LOG: log, CX_STATE: stateDir,
            XDG_RUNTIME_DIR: runtime, TMPDIR: temp, COMPOSE_PROFILES: "browser", LEAK: "shell-value", ...env,
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
    return { root, temp, stateDir, claims, runs, invoke, launch, calls };
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
