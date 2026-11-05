import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
    existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync, writeFileSync,
} from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "worktree.mjs");
const GIT_ENV = {
    ...process.env, GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com",
};
// Fixture project selection must not inherit the host shell's Compose project.
delete GIT_ENV.COMPOSE_PROJECT_NAME;
const COMPOSE = ["compose", "-f", "infrastructure/docker-compose.yml", "-f", "infrastructure/docker-compose.worktree.yml"];

function git(cwd, ...args) {
    return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function write(root, path, contents) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
}

function fixture(t) {
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "cx-worktree-")));
    t.after(() => rmSync(parent, { recursive: true, force: true }));
    const origin = join(parent, "origin.git");
    const main = join(parent, "primary");
    git(parent, "init", "--bare", "-q", "-b", "main", origin);
    git(parent, "clone", "-q", origin, main);
    write(main, ".gitignore", [
        "backend/config/.env", "frontend/.env", "frontend/.env.development", "infrastructure/.env",
        "infrastructure/dev-certs/*.pem", ".venv-backend", ".claude", ".codex", "",
    ].join("\n"));
    write(main, ".worktreeinclude", "backend/config/.env\nfrontend/.env\nfrontend/.env.development\ninfrastructure/dev-certs/*.pem\n");
    write(main, "infrastructure/docker-compose.yml", "services: {}\n");
    write(main, "infrastructure/docker-compose.worktree.yml", "services: {}\n");
    write(main, ".arc/reference/harness-hooks/seed-session-notes.mjs", `
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.CX_TEST_LOG, JSON.stringify({ command: 'seed', args: [], cwd: process.cwd() }) + '\\n');
if (process.env.CX_SEED_FAIL) { console.error('seed refused'); process.exit(7); }
`);
    git(main, "add", ".");
    git(main, "commit", "-q", "-m", "initial");
    git(main, "push", "-q", "origin", "main");
    for (const path of ["backend/config/.env", "frontend/.env", "frontend/.env.development",
        "infrastructure/dev-certs/cert.pem", "infrastructure/dev-certs/key.pem"]) {
        write(main, path, `stand-in ${path}\n`);
    }
    write(main, "infrastructure/.env", "DATABASE_NAME=example\n");
    for (const folder of [".venv-backend", ".claude", ".codex"]) mkdirSync(join(main, folder));
    const bin = join(parent, "bin");
    const log = join(parent, "calls.jsonl");
    mkdirSync(bin);
    const stub = `#!${process.execPath}
import { appendFileSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
const command = basename(process.argv[1]);
const args = process.argv.slice(2);
appendFileSync(process.env.CX_TEST_LOG, JSON.stringify({ command, args, cwd: process.cwd() }) + '\\n');
if (process.env.CX_FAIL && [command, ...args].includes(process.env.CX_FAIL)) {
    console.error('stub command failed: ' + process.env.CX_FAIL);
    process.exit(9);
}
if (command === 'docker' && args.includes('config')) {
    const env = readFileSync(join(process.cwd(), 'infrastructure/.env'), 'utf8');
    const project = process.env.CX_PROJECT ?? process.env.COMPOSE_PROJECT_NAME ?? env.match(/^COMPOSE_PROJECT_NAME=(.*)$/m)?.[1];
    console.log('name: ' + project + '\\nservices:\\n  backend:\\n    environment:\\n      SECRET: hidden-marker');
}
if (command === 'docker' && args.includes('ls')) console.log(process.env.CX_IDS || '');
`;
    for (const command of ["docker", "npm"]) {
        writeFileSync(join(bin, command), stub, { mode: 0o755 });
    }
    function invoke(cwd, args, env = {}) {
        return spawnSync(process.execPath, [SCRIPT, ...args], {
            cwd, env: { ...GIT_ENV, PATH: `${bin}:${process.env.PATH}`, CX_TEST_LOG: log, ...env }, encoding: "utf8",
        });
    }
    function worktree(name = "sample", { checkout = true } = {}) {
        const path = join(parent, `primary.${name}`);
        git(main, "worktree", "add", "-q", ...(checkout ? [] : ["--no-checkout"]), "-b", `fix/${name}`, path);
        return path;
    }
    function calls() {
        return existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
    }
    return { main, parent, origin, invoke, worktree, calls };
}

function success(result) {
    assert.equal(result.status, 0, result.stdout + result.stderr);
}

function refusal(result, reason) {
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, reason);
}

function envOf(root) {
    return readFileSync(join(root, "infrastructure/.env"), "utf8");
}

test("help describes all four commands and unknown commands refuse", (t) => {
    const f = fixture(t);
    const help = f.invoke(f.main, ["--help"]);
    success(help);
    for (const command of ["create", "provision", "browse", "remove"]) assert.match(help.stdout, new RegExp(command));
    refusal(f.invoke(f.main, ["unknown"]), /unknown command/i);
    assert.deepEqual(f.calls(), []);
});

test("provision refuses the main checkout without changing its environment", (t) => {
    const f = fixture(t);
    const before = envOf(f.main);
    refusal(f.invoke(f.main, ["provision"]), /main checkout/i);
    assert.equal(envOf(f.main), before);
    assert.deepEqual(f.calls(), []);
});

test("provision copies the base environment and appends a project, port and random key", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    success(f.invoke(path, ["provision"]));
    assert.match(envOf(path), /^DATABASE_NAME=example\n/);
    assert.match(envOf(path), /^COMPOSE_PROJECT_NAME=cinexplorer-sample$/m);
    assert.match(envOf(path), /^SITE_PORT=8445$/m);
    assert.match(envOf(path), /^WORKTREE_SECRET_KEY=[a-z0-9]{50}$/m);
    assert.equal(envOf(f.main), "DATABASE_NAME=example\n");
});

test("provision preserves existing keys and is idempotent", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", "COMPOSE_PROJECT_NAME=cinexplorer-sample\nSITE_PORT=8480\n");
    success(f.invoke(path, ["provision"]));
    const first = envOf(path);
    assert.match(first, /^COMPOSE_PROJECT_NAME=cinexplorer-sample\nSITE_PORT=8480\nWORKTREE_SECRET_KEY=[a-z0-9]{50}\n$/);
    success(f.invoke(path, ["provision"]));
    assert.equal(envOf(path), first);
});

test("provision derives the lowercased project from the folder name", (t) => {
    const f = fixture(t);
    const path = f.worktree("Some-Name");
    success(f.invoke(path, ["provision"]));
    assert.match(envOf(path), /^COMPOSE_PROJECT_NAME=cinexplorer-some-name$/m);
});

test("provision refuses an invalid folder name", (t) => {
    const f = fixture(t);
    const path = f.worktree("my_wt");
    refusal(f.invoke(path, ["provision"]), /name.*letters, digits and hyphens/i);
    assert.equal(existsSync(join(path, "infrastructure/.env")), false);
    assert.deepEqual(f.calls(), []);
});

test("allocation uses the lowest unclaimed port and ignores a deleted folder", (t) => {
    const f = fixture(t);
    for (const [name, port] of [["one", 8445], ["two", 8447], ["deleted", 8446]]) {
        const path = f.worktree(name);
        write(path, "infrastructure/.env", `SITE_PORT=${port}\n`);
        if (name === "deleted") rmSync(path, { recursive: true });
    }
    const path = f.worktree();
    success(f.invoke(path, ["provision"]));
    assert.match(envOf(path), /^SITE_PORT=8446$/m);
});

test("allocation refuses a full port range without writing the environment", (t) => {
    const f = fixture(t);
    for (let port = 8445; port <= 8499; port++) {
        write(f.worktree(`port-${port}`, { checkout: false }), "infrastructure/.env", `SITE_PORT=${port}\n`);
    }
    const path = f.worktree();
    refusal(f.invoke(path, ["provision"]), /no.*port.*8445.*8499/i);
    assert.equal(existsSync(join(path, "infrastructure/.env")), false);
    assert.deepEqual(f.calls(), []);
});

test("provision copies only included ignored files and keeps existing copies and folders", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(f.main, "unignored.txt", "do not copy\n");
    write(path, ".worktreeinclude", readFileSync(join(path, ".worktreeinclude"), "utf8") + "unignored.txt\n");
    write(path, "frontend/.env", "keep this copy\n");
    mkdirSync(join(path, ".claude"));
    const result = f.invoke(path, ["provision"]);
    success(result);
    for (const file of ["backend/config/.env", "frontend/.env.development", "infrastructure/dev-certs/cert.pem", "infrastructure/dev-certs/key.pem"]) {
        assert.equal(readFileSync(join(path, file), "utf8"), readFileSync(join(f.main, file), "utf8"));
    }
    assert.equal(readFileSync(join(path, "frontend/.env"), "utf8"), "keep this copy\n");
    assert.equal(existsSync(join(path, "unignored.txt")), false);
    for (const folder of [".venv-backend", ".codex"]) assert.equal(readlinkSync(join(path, folder)), join(f.main, folder));
    assert.equal(realpathSync(join(path, ".claude")), join(path, ".claude"));
});

test("provision skips missing shared tools and links later installations without replacing local tools", (t) => {
    const f = fixture(t);
    const folders = [".venv-backend", ".claude", ".codex"];
    for (const folder of folders) rmSync(join(f.main, folder), { recursive: true });
    const path = f.worktree();
    success(f.invoke(path, ["provision"]));
    for (const folder of folders) {
        assert.equal(lstatSync(join(path, folder), { throwIfNoEntry: false }), undefined);
    }
    mkdirSync(join(path, ".codex"));
    write(path, ".codex/local.txt", "keep local settings\n");
    for (const folder of folders) mkdirSync(join(f.main, folder));
    success(f.invoke(path, ["provision"]));
    for (const folder of [".venv-backend", ".claude"]) {
        assert.equal(readlinkSync(join(path, folder)), join(f.main, folder));
    }
    assert.equal(lstatSync(join(path, ".codex")).isDirectory(), true);
    assert.equal(readFileSync(join(path, ".codex/local.txt"), "utf8"), "keep local settings\n");
});

test("provision checks only the project name then installs and typegens in the frontend", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    const result = f.invoke(path, ["provision"]);
    success(result);
    assert.match(result.stdout, /name: cinexplorer-sample/);
    assert.doesNotMatch(result.stdout + result.stderr, /hidden-marker/);
    assert.deepEqual(f.calls(), [
        { command: "docker", args: [...COMPOSE, "config"], cwd: path },
        { command: "npm", args: ["ci"], cwd: join(path, "frontend") },
        { command: "npm", args: ["run", "typegen"], cwd: join(path, "frontend") },
    ]);
});

test("provision refuses a different Compose project without leaking configuration or installing", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    const result = f.invoke(path, ["provision"], { CX_PROJECT: "infrastructure" });
    refusal(result, /project.*cinexplorer-sample.*infrastructure/i);
    assert.doesNotMatch(result.stdout + result.stderr, /hidden-marker/);
    assert.deepEqual(f.calls(), [{ command: "docker", args: [...COMPOSE, "config"], cwd: path }]);
});

test("a failed frontend install stops provisioning with its output", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    refusal(f.invoke(path, ["provision"], { CX_FAIL: "ci" }), /stub command failed: ci/);
    assert.deepEqual(f.calls().filter((call) => call.command === "npm"), [
        { command: "npm", args: ["ci"], cwd: join(path, "frontend") },
    ]);
});

test("provision works after an external tool copied the files and repeats the check and install", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    for (const file of ["backend/config/.env", "frontend/.env", "frontend/.env.development",
        "infrastructure/dev-certs/cert.pem", "infrastructure/dev-certs/key.pem"]) {
        write(path, file, "already copied\n");
    }
    success(f.invoke(path, ["provision"]));
    const first = envOf(path);
    success(f.invoke(path, ["provision"]));
    assert.equal(envOf(path), first);
    assert.equal(readFileSync(join(path, "backend/config/.env"), "utf8"), "already copied\n");
    assert.equal(f.calls().length, 6);
    assert.deepEqual(f.calls().slice(3), f.calls().slice(0, 3));
});

test("create refuses a linked checkout", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    refusal(f.invoke(path, ["create", "fix/new"]), /main checkout/i);
    assert.equal(existsSync(join(f.parent, "primary.new")), false);
    assert.deepEqual(f.calls(), []);
});

for (const branch of ["fix", "Fix/x", "fix/-x", "fix/x_y"]) {
    test(`create refuses malformed branch ${branch}`, (t) => {
        const f = fixture(t);
        refusal(f.invoke(f.main, ["create", branch]), /branch.*\{type\}\/\{name\}/i);
        assert.equal(git(f.main, "worktree", "list", "--porcelain").split("worktree ").length, 2);
        assert.deepEqual(f.calls(), []);
    });
}

test("create refuses an existing folder", (t) => {
    const f = fixture(t);
    const path = join(f.parent, "primary.new");
    mkdirSync(path);
    write(path, "keep", "original");
    refusal(f.invoke(f.main, ["create", "fix/new"]), /folder.*exists/i);
    assert.equal(readFileSync(join(path, "keep"), "utf8"), "original");
    assert.equal(git(f.main, "branch", "--list", "fix/new"), "");
    assert.deepEqual(f.calls(), []);
});

for (const remote of [false, true]) {
    test(`create refuses a branch that exists ${remote ? "only on origin" : "locally"}`, (t) => {
        const f = fixture(t);
        git(f.main, "branch", "fix/new");
        if (remote) {
            git(f.main, "push", "-q", "origin", "fix/new");
            git(f.main, "branch", "-d", "fix/new");
        }
        refusal(f.invoke(f.main, ["create", "fix/new"]), /branch.*already exists/i);
        assert.equal(existsSync(join(f.parent, "primary.new")), false);
        assert.deepEqual(f.calls(), []);
    });
}

test("create cuts a branch from origin/main without an upstream and provisions it", (t) => {
    const f = fixture(t);
    git(f.main, "commit", "-q", "--allow-empty", "-m", "main checkout ahead");
    const result = f.invoke(f.main, ["create", "fix/new"]);
    success(result);
    const path = join(f.parent, "primary.new");
    assert.equal(git(path, "branch", "--show-current"), "fix/new");
    assert.equal(git(path, "rev-parse", "HEAD"), git(f.main, "rev-parse", "origin/main"));
    assert.equal(git(path, "for-each-ref", "--format=%(upstream)", "refs/heads/fix/new"), "");
    assert.match(envOf(path), /^COMPOSE_PROJECT_NAME=cinexplorer-new$/m);
    assert.match(result.stdout, /git push -u origin fix\/new/);
    assert.ok(result.stdout.includes(path));
    assert.match(result.stdout, /node scripts\/worktree.mjs browse/);
    assert.deepEqual(f.calls().map((call) => call.command), ["docker", "npm", "npm"]);
});

for (const remote of [false, true]) {
    test(`create --existing provisions a ${remote ? "remote-only" : "local"} branch`, (t) => {
        const f = fixture(t);
        git(f.main, "branch", "fix/review");
        if (remote) {
            git(f.main, "push", "-q", "origin", "fix/review");
            git(f.main, "branch", "-d", "fix/review");
        }
        success(f.invoke(f.main, ["create", "fix/review", "--existing"]));
        const path = join(f.parent, "primary.review");
        assert.equal(git(path, "branch", "--show-current"), "fix/review");
        assert.match(envOf(path), /^COMPOSE_PROJECT_NAME=cinexplorer-review$/m);
        assert.deepEqual(f.calls().map((call) => call.command), ["docker", "npm", "npm"]);
    });
}

test("create --existing refuses a branch checked out elsewhere", (t) => {
    const f = fixture(t);
    git(f.main, "worktree", "add", "-q", "-b", "fix/review", join(f.parent, "elsewhere"));
    refusal(f.invoke(f.main, ["create", "fix/review", "--existing"]), /checked out/i);
    assert.equal(existsSync(join(f.parent, "primary.review")), false);
    assert.deepEqual(f.calls(), []);
});

test("create --existing refuses a branch without the override", (t) => {
    const f = fixture(t);
    git(f.main, "switch", "-q", "-c", "fix/old");
    git(f.main, "rm", "-q", "infrastructure/docker-compose.worktree.yml");
    git(f.main, "commit", "-q", "-m", "old branch");
    git(f.main, "switch", "-q", "main");
    refusal(f.invoke(f.main, ["create", "fix/old", "--existing"]), /merge main.*first/i);
    assert.equal(existsSync(join(f.parent, "primary.old")), false);
    assert.deepEqual(f.calls(), []);
});

test("create --work-unit refuses --existing before creating anything", (t) => {
    const f = fixture(t);
    refusal(f.invoke(f.main, ["create", "fix/new", "--existing", "--work-unit"]), /--work-unit.*--existing/);
    assert.equal(existsSync(join(f.parent, "primary.new")), false);
    assert.deepEqual(f.calls(), []);
});

test("create --work-unit seeds after provisioning", (t) => {
    const f = fixture(t);
    success(f.invoke(f.main, ["create", "technical/new", "--work-unit"]));
    const path = join(f.parent, "primary.new");
    assert.deepEqual(f.calls().map((call) => call.command), ["docker", "npm", "npm", "seed"]);
    assert.deepEqual(f.calls().at(-1), { command: "seed", args: [], cwd: path });
});

test("create explains how to recover when provisioning fails", (t) => {
    const f = fixture(t);
    const result = f.invoke(f.main, ["create", "fix/new", "--work-unit"], { CX_FAIL: "ci" });
    refusal(result, /stub command failed: ci/);
    assert.match(result.stderr, /node scripts\/worktree.mjs provision/);
    assert.match(result.stderr, /seed-session-notes.mjs/);
    assert.equal(git(join(f.parent, "primary.new"), "branch", "--show-current"), "fix/new");
    assert.equal(f.calls().some((call) => call.command === "seed"), false);
});

test("a seeding refusal keeps the provisioned worktree and offers retry", (t) => {
    const f = fixture(t);
    const result = f.invoke(f.main, ["create", "fix/new", "--work-unit"], { CX_SEED_FAIL: "1" });
    refusal(result, /seed refused/);
    assert.match(result.stderr, /seed-session-notes.mjs.*again/i);
    assert.match(envOf(join(f.parent, "primary.new")), /^SITE_PORT=8445$/m);
    assert.deepEqual(f.calls().map((call) => call.command), ["docker", "npm", "npm", "seed"]);
});

const BROWSER = [...COMPOSE, "--profile", "browser"];
const BROWSE_ENV = "COMPOSE_PROJECT_NAME=cinexplorer-sample\nSITE_PORT=8445\nWORKTREE_SECRET_KEY=example\n";

test("browse refuses the main checkout before any Docker call", (t) => {
    const f = fixture(t);
    refusal(f.invoke(f.main, ["browse"]), /main checkout/i);
    assert.deepEqual(f.calls(), []);
});

for (const key of ["COMPOSE_PROJECT_NAME", "SITE_PORT", "WORKTREE_SECRET_KEY"]) {
    test(`browse refuses a missing ${key} before any Docker call`, (t) => {
        const f = fixture(t);
        const path = f.worktree();
        write(path, "infrastructure/.env", BROWSE_ENV.split("\n").filter((line) => !line.startsWith(`${key}=`)).join("\n"));
        refusal(f.invoke(path, ["browse"]), new RegExp(`${key}.*provision`, "i"));
        assert.deepEqual(f.calls(), []);
    });
}

for (const scenario of [
    { name: "another project in the env file", contents: BROWSE_ENV.replace("cinexplorer-sample", "infrastructure"), env: {}, reason: /project.*cinexplorer-sample.*infrastructure/i },
    { name: "an overriding project from the environment", contents: BROWSE_ENV, env: { COMPOSE_PROJECT_NAME: "infrastructure" }, reason: /project.*cinexplorer-sample.*infrastructure/i },
    { name: "failed configuration resolution", contents: BROWSE_ENV, env: { CX_FAIL: "config" }, reason: /stub command failed: config/ },
]) {
    test(`browse refuses ${scenario.name} before stateful commands`, (t) => {
        const f = fixture(t);
        const path = f.worktree();
        write(path, "infrastructure/.env", scenario.contents);
        const result = f.invoke(path, ["browse"], scenario.env);
        refusal(result, scenario.reason);
        assert.doesNotMatch(result.stdout + result.stderr, /hidden-marker/);
        assert.ok(f.calls().every((call) => call.command === "docker" && call.args.includes("config")),
            "a refused project must never reach startup or database commands");
    });
}

test("browse waits for the stack then migrates and seeds in order", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    const result = f.invoke(path, ["browse"]);
    success(result);
    assert.doesNotMatch(result.stdout + result.stderr, /hidden-marker/);
    assert.deepEqual(f.calls().filter((call) => !call.args.includes("config")), [
        { command: "docker", args: [...BROWSER, "up", "-d", "--wait"], cwd: path },
        { command: "docker", args: [...BROWSER, "exec", "-T", "backend", "python", "manage.py", "migrate", "--noinput"], cwd: path },
        { command: "docker", args: [...BROWSER, "exec", "-T", "backend", "python", "manage.py", "seed_dev_data"], cwd: path },
    ]);
    assert.match(result.stdout, /https:\/\/localhost:8445/);
    assert.match(result.stdout, /dev.*cinexplorer-dev/);
});

test("a failed stack start prints its output and never migrates or seeds", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    refusal(f.invoke(path, ["browse"], { CX_FAIL: "up" }), /stub command failed: up/);
    assert.deepEqual(f.calls().filter((call) => !call.args.includes("config")), [
        { command: "docker", args: [...BROWSER, "up", "-d", "--wait"], cwd: path },
    ]);
});

function preserved(f, path, args, reason) {
    const head = git(path, "rev-parse", "HEAD");
    const status = git(path, "status", "--porcelain");
    const env = envOf(path);
    refusal(f.invoke(f.main, args), reason);
    assert.equal(git(path, "rev-parse", "HEAD"), head);
    assert.equal(git(path, "status", "--porcelain"), status);
    assert.equal(envOf(path), env);
    assert.deepEqual(f.calls(), []);
}

test("remove refuses a linked checkout before any Docker call", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    refusal(f.invoke(path, ["remove", "sample"]), /main checkout/i);
    assert.equal(git(path, "branch", "--show-current"), "fix/sample");
    assert.deepEqual(f.calls(), []);
});

test("remove refuses an unregistered folder", (t) => {
    const f = fixture(t);
    const path = join(f.parent, "primary.unknown");
    mkdirSync(path);
    write(path, "keep", "original");
    refusal(f.invoke(f.main, ["remove", "unknown"]), /registered worktree/i);
    assert.equal(readFileSync(join(path, "keep"), "utf8"), "original");
    assert.deepEqual(f.calls(), []);
});

test("remove refuses a detached worktree", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    git(path, "checkout", "-q", "--detach");
    preserved(f, path, ["remove", "sample"], /branch.*checked out|detached/i);
});

test("remove refuses an unmerged branch without changing its worktree", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    git(path, "commit", "-q", "--allow-empty", "-m", "unmerged work");
    preserved(f, path, ["remove", "sample"], /not merged|unmerged/i);
});

for (const untracked of [false, true]) {
    test(`remove refuses ${untracked ? "untracked" : "modified tracked"} files before teardown`, (t) => {
        const f = fixture(t);
        const path = f.worktree();
        write(path, "infrastructure/.env", BROWSE_ENV);
        write(path, untracked ? "new.txt" : ".worktreeinclude", "keep my changes\n");
        preserved(f, path, ["remove", "sample"], /uncommitted|untracked/i);
    });
}

test("remove refuses a locked worktree before teardown", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    git(f.main, "worktree", "lock", path);
    preserved(f, path, ["remove", "sample"], /locked/i);
    assert.match(git(f.main, "worktree", "list", "--porcelain"), /^locked$/m);
});

test("remove refuses another Compose project before teardown", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", "COMPOSE_PROJECT_NAME=infrastructure\n");
    preserved(f, path, ["remove", "sample"], /project.*cinexplorer-sample.*infrastructure/i);
});

test("remove tears down all labelled resource kinds before removing a merged worktree and branch", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    git(f.main, "switch", "-q", "-c", "chore/elsewhere");
    const trace = join(f.parent, "git-trace.log");
    success(f.invoke(f.main, ["remove", "sample"], { CX_IDS: "first\nsecond", GIT_TRACE: trace }));
    const label = "label=com.docker.compose.project=cinexplorer-sample";
    assert.deepEqual(f.calls(), [
        { command: "docker", args: ["container", "ls", "-a", "--filter", label, "-q"], cwd: f.main },
        { command: "docker", args: ["container", "stop", "first", "second"], cwd: f.main },
        { command: "docker", args: ["container", "rm", "first", "second"], cwd: f.main },
        ...["volume", "network", "image"].flatMap((kind) => [
            { command: "docker", args: [kind, "ls", "--filter", label, "-q"], cwd: f.main },
            { command: "docker", args: [kind, "rm", "first", "second"], cwd: f.main },
        ]),
    ]);
    assert.equal(existsSync(path), false);
    assert.doesNotMatch(git(f.main, "worktree", "list", "--porcelain"), /primary\.sample/);
    assert.equal(git(f.main, "branch", "--list", "fix/sample"), "");
    assert.equal(git(f.main, "branch", "--show-current"), "chore/elsewhere");
    assert.match(readFileSync(trace, "utf8"), /git fetch --prune/);
});

for (const contents of ["DATABASE_NAME=example\n", null]) {
    test(`remove skips Docker when ${contents === null ? "the env file is absent" : "no project is named"}`, (t) => {
        const f = fixture(t);
        const path = f.worktree();
        if (contents !== null) write(path, "infrastructure/.env", contents);
        success(f.invoke(f.main, ["remove", "sample"]));
        assert.deepEqual(f.calls(), []);
        assert.equal(existsSync(path), false);
        assert.equal(git(f.main, "branch", "--list", "fix/sample"), "");
    });
}

test("remove skips empty resource listings", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    success(f.invoke(f.main, ["remove", "sample"]));
    assert.equal(existsSync(path), false);
    assert.deepEqual(f.calls().map((call) => call.args.slice(0, 2)), [
        ["container", "ls"], ["volume", "ls"], ["network", "ls"], ["image", "ls"],
    ]);
});

test("remove --keep-branch tears down an unmerged worktree and preserves its branch at its commit", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    git(path, "commit", "-q", "--allow-empty", "-m", "unmerged work");
    const head = git(path, "rev-parse", "HEAD");
    success(f.invoke(f.main, ["remove", "sample", "--keep-branch"], { CX_IDS: "resource" }));
    assert.equal(existsSync(path), false);
    assert.equal(git(f.main, "rev-parse", "fix/sample"), head);
    assert.equal(f.calls().filter((call) => call.args[1] === "rm").length, 4);
});
