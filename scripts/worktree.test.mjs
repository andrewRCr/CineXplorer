import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
    chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync,
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
    write(main, ".arc/reference/harness-hooks/finish-work.mjs", `
import { appendFileSync, existsSync } from 'node:fs';
const args = process.argv.slice(2);
const present = existsSync(process.cwd() + '.' + args[1]);
appendFileSync(process.env.CX_TEST_LOG, JSON.stringify({ command: 'closing', args, cwd: process.cwd(), present }) + '\\n');
if (process.env.CX_CLOSING_FAIL === args[0]) { console.error('closing step refused'); process.exit(7); }
console.log('closing ' + args[0]);
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
import { appendFileSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
const command = basename(process.argv[1]);
const args = process.argv.slice(2);
appendFileSync(process.env.CX_TEST_LOG, JSON.stringify({ command, args, cwd: process.cwd() }) + '\\n');
if (process.env.CX_FAIL && [command, ...args].includes(process.env.CX_FAIL)) {
    console.error('stub command failed: ' + process.env.CX_FAIL);
    process.exit(9);
}
if (command === 'docker' && args.includes('up') && process.env.CX_REQUIRE_FRONTEND_LOGS) {
    const logs = statSync(join(process.cwd(), 'frontend/logs'));
    if (!logs.isDirectory() || logs.uid !== process.getuid()) {
        console.error('frontend logs must be owned by the host user before Docker starts');
        process.exit(9);
    }
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

test("help describes all five commands and unknown commands refuse", (t) => {
    const f = fixture(t);
    const help = f.invoke(f.main, ["--help"]);
    success(help);
    for (const command of ["create", "provision", "browse", "remove", "finish"]) assert.match(help.stdout, new RegExp(command));
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
    assert.equal(readlinkSync(join(path, ".venv-backend")), join(f.main, ".venv-backend"));
    assert.equal(lstatSync(join(path, ".codex")).isDirectory(), true);
    assert.equal(realpathSync(join(path, ".claude")), join(path, ".claude"));
});

test("provision creates a real Codex folder with live links to each shared entry", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    const entries = {
        "hooks/check.mjs": "export const message = 'shared hook';\n",
        "hooks.json": '{"hooks": {}}\n',
        "skills/example/SKILL.md": "Shared skill\n",
    };
    for (const [file, contents] of Object.entries(entries)) write(f.main, `.codex/${file}`, contents);
    success(f.invoke(path, ["provision"]));
    assert.equal(lstatSync(join(path, ".codex")).isDirectory(), true);
    for (const entry of ["hooks", "hooks.json", "skills"]) {
        assert.equal(readlinkSync(join(path, ".codex", entry)), join(f.main, ".codex", entry));
    }
    for (const [file, contents] of Object.entries(entries)) {
        assert.equal(readFileSync(join(path, ".codex", file), "utf8"), contents);
    }
    write(f.main, ".codex/hooks/check.mjs", "export const message = 'updated hook';\n");
    success(f.invoke(path, ["provision"]));
    assert.equal(lstatSync(join(path, ".codex")).isDirectory(), true);
    assert.equal(readFileSync(join(path, ".codex/hooks/check.mjs"), "utf8"), "export const message = 'updated hook';\n");
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

for (const option of [null, "--existing", "--work-unit"]) {
    test(`create --no-install provisions for later installation${option ? ` with ${option}` : ""}`, (t) => {
        const f = fixture(t);
        if (option === "--existing") git(f.main, "branch", "fix/new");
        const result = f.invoke(f.main, ["create", "fix/new", "--no-install", ...(option ? [option] : [])], { CX_FAIL: "docker" });
        success(result);
        const path = join(f.parent, "primary.new");
        assert.equal(git(path, "branch", "--show-current"), "fix/new");
        assert.equal(git(path, "rev-parse", "HEAD"), git(f.main, "rev-parse", "origin/main"));
        assert.match(envOf(path), /^COMPOSE_PROJECT_NAME=cinexplorer-new$/m);
        assert.match(envOf(path), /^SITE_PORT=8445$/m);
        assert.match(envOf(path), /^WORKTREE_SECRET_KEY=[a-z0-9]{50}$/m);
        for (const file of ["backend/config/.env", "frontend/.env", "frontend/.env.development",
            "infrastructure/dev-certs/cert.pem", "infrastructure/dev-certs/key.pem"]) {
            assert.equal(readFileSync(join(path, file), "utf8"), `stand-in ${file}\n`);
        }
        for (const folder of [".venv-backend", ".claude"]) {
            assert.equal(readlinkSync(join(path, folder)), join(f.main, folder));
        }
        assert.equal(lstatSync(join(path, ".codex")).isDirectory(), true);
        assert.match(result.stdout, /node scripts\/worktree.mjs provision/);
        assert.deepEqual(f.calls(), option === "--work-unit"
            ? [{ command: "seed", args: [], cwd: path }] : []);
        success(f.invoke(path, ["provision"]));
        assert.deepEqual(f.calls().slice(-3), [
            { command: "docker", args: [...COMPOSE, "config"], cwd: path },
            { command: "npm", args: ["ci"], cwd: join(path, "frontend") },
            { command: "npm", args: ["run", "typegen"], cwd: join(path, "frontend") },
        ]);
    });
}

test("create --no-install makes no Docker call and browse still refuses a mismatched project", (t) => {
    const f = fixture(t);
    success(f.invoke(f.main, ["create", "fix/new", "--no-install"], { CX_FAIL: "docker" }));
    const path = join(f.parent, "primary.new");
    assert.match(envOf(path), /^COMPOSE_PROJECT_NAME=cinexplorer-new$/m);
    assert.deepEqual(f.calls(), []);
    const result = f.invoke(path, ["browse"], { CX_PROJECT: "infrastructure" });
    refusal(result, /project.*cinexplorer-new.*infrastructure/i);
    assert.doesNotMatch(result.stdout + result.stderr, /hidden-marker/);
    assert.deepEqual(f.calls(), [{ command: "docker", args: [...COMPOSE, "config"], cwd: path }]);
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
        { command: "docker", args: [...BROWSER, "exec", "-T", "-e", "DJANGO_CONSOLE_LOG_LEVEL=INFO", "backend", "python", "manage.py", "migrate", "--noinput"], cwd: path },
        { command: "docker", args: [...BROWSER, "exec", "-T", "-e", "DJANGO_CONSOLE_LOG_LEVEL=INFO", "backend", "python", "manage.py", "seed_dev_data"], cwd: path },
    ]);
    assert.match(result.stdout, /https:\/\/localhost:8445/);
    assert.match(result.stdout, /dev.*cinexplorer-dev/);
});

test("browse prepares frontend logs as the host user before starting Docker", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    success(f.invoke(path, ["browse"], { CX_REQUIRE_FRONTEND_LOGS: "1" }));
    write(path, "frontend/logs/sentinel", "keep existing logs");
    success(f.invoke(path, ["browse"], { CX_REQUIRE_FRONTEND_LOGS: "1" }));
    assert.equal(readFileSync(join(path, "frontend/logs/sentinel"), "utf8"), "keep existing logs");
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

for (const command of ["remove", "finish"]) {
    for (const mode of [0o555, 0o000]) {
        test(`${command} refuses deletion blockers with mode ${mode.toString(8)} before changing the worktree or stack`, {
            skip: process.getuid?.() === 0 ? "root bypasses directory permission checks" : false,
        }, (t) => {
            const f = fixture(t);
            const path = f.worktree();
            write(path, "infrastructure/.env", BROWSE_ENV);
            const relative = ".claude/blocked directory's";
            const blocker = join(path, relative);
            write(path, `${relative}/sentinel`, "keep this file");
            git(f.main, "commit", "-q", "--allow-empty", "-m", "newer remote main");
            git(f.main, "push", "-q", "origin", "main");
            git(f.main, "reset", "-q", "--hard", "HEAD~1");
            const registration = git(f.main, "worktree", "list", "--porcelain");
            const mainHead = git(f.main, "rev-parse", "HEAD");
            const branchHead = git(path, "rev-parse", "HEAD");
            const environment = envOf(path);
            chmodSync(blocker, mode);
            try {
                const result = f.invoke(f.main, [command, "sample"], { CX_IDS: "live-resource" });
                assert.deepEqual({
                    registration: git(f.main, "worktree", "list", "--porcelain"),
                    mainHead: git(f.main, "rev-parse", "HEAD"),
                    checkoutExists: existsSync(path),
                }, { registration, mainHead, checkoutExists: true });
                refusal(result, /deletion.*permission|permission.*delet/i);
                assert.ok(result.stderr.includes(blocker), result.stderr);
                const repair = result.stderr.split("\n").map((line) => line.trim())
                    .find((line) => line.startsWith("chmod u+rwx -- "));
                assert.ok(repair, result.stderr);
                assert.equal(lstatSync(blocker).mode & 0o777, mode);
                assert.equal(git(f.main, "worktree", "list", "--porcelain"), registration);
                assert.equal(git(f.main, "rev-parse", "HEAD"), mainHead);
                assert.equal(git(path, "rev-parse", "HEAD"), branchHead);
                assert.equal(git(f.main, "rev-parse", "fix/sample"), branchHead);
                assert.equal(envOf(path), environment);
                assert.deepEqual(f.calls(), []);
                execFileSync("sh", ["-c", repair], { cwd: f.main, env: GIT_ENV });
                assert.equal(lstatSync(blocker).mode & 0o700, 0o700);
                assert.equal(readFileSync(join(blocker, "sentinel"), "utf8"), "keep this file");
            } finally {
                if (existsSync(blocker)) chmodSync(blocker, 0o755);
            }
            success(f.invoke(f.main, [command, "sample"], { CX_IDS: "live-resource" }));
            assert.equal(existsSync(path), false);
            assert.doesNotMatch(git(f.main, "worktree", "list", "--porcelain"), /primary\.sample/);
            assert.equal(git(f.main, "branch", "--list", "fix/sample"), "");
        });
    }
}

for (const scenario of ["read-only file", "read-only empty directory", "non-searchable empty directory", "shared symlink", "dangling symlink"]) {
    test(`remove permits a ${scenario} without changing shared targets`, (t) => {
        const f = fixture(t);
        const path = f.worktree();
        write(path, "infrastructure/.env", BROWSE_ENV);
        const shared = join(f.parent, "shared-tools");
        const ignored = join(path, ".claude");
        if (scenario.endsWith("symlink")) {
            if (scenario === "shared symlink") {
                write(f.parent, "shared-tools/sentinel", "keep shared tools");
                chmodSync(shared, 0o000);
            }
            symlinkSync(shared, ignored, "dir");
        } else if (scenario === "read-only file") {
            write(path, ".claude/sentinel", "read only");
            chmodSync(join(ignored, "sentinel"), 0o444);
        } else {
            mkdirSync(ignored);
            chmodSync(ignored, scenario === "read-only empty directory" ? 0o555 : 0o444);
        }
        try {
            success(f.invoke(f.main, ["remove", "sample"]));
            assert.equal(existsSync(path), false);
            assert.doesNotMatch(git(f.main, "worktree", "list", "--porcelain"), /primary\.sample/);
            assert.equal(git(f.main, "branch", "--list", "fix/sample"), "");
        } finally {
            if (existsSync(shared)) chmodSync(shared, 0o755);
            if (!scenario.endsWith("symlink") && existsSync(ignored)) chmodSync(ignored, 0o755);
        }
        if (scenario === "shared symlink") assert.equal(readFileSync(join(shared, "sentinel"), "utf8"), "keep shared tools");
        if (scenario === "dangling symlink") assert.equal(existsSync(shared), false);
    });
}

test("remove refuses a parent directory that prevents deleting the checkout", {
    skip: process.getuid?.() === 0 ? "root bypasses directory permission checks" : false,
}, (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    const registration = git(f.main, "worktree", "list", "--porcelain");
    chmodSync(f.parent, 0o555);
    try {
        const result = f.invoke(f.main, ["remove", "sample"], { CX_IDS: "live-resource" });
        assert.equal(git(f.main, "worktree", "list", "--porcelain"), registration);
        refusal(result, /deletion permission blockers/i);
        assert.ok(result.stderr.includes(f.parent), result.stderr);
        assert.match(result.stderr, /chmod u\+wx/);
        assert.equal(envOf(path), BROWSE_ENV);
        assert.deepEqual(f.calls(), []);
    } finally {
        chmodSync(f.parent, 0o755);
    }
});

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

for (const flags of [["--no-stack"], ["--keep-branch", "--no-stack"], ["--no-stack", "--keep-branch"]]) {
    test(`remove ${flags.join(" ")} removes the checkout without Docker`, (t) => {
        const f = fixture(t);
        const path = f.worktree();
        write(path, "infrastructure/.env", BROWSE_ENV);
        const keepBranch = flags.includes("--keep-branch");
        if (keepBranch) git(path, "commit", "-q", "--allow-empty", "-m", "unmerged work");
        const head = git(path, "rev-parse", "HEAD");
        const result = f.invoke(f.main, ["remove", "sample", ...flags], { CX_FAIL: "docker" });
        success(result);
        assert.deepEqual(f.calls(), []);
        assert.equal(existsSync(path), false);
        assert.doesNotMatch(git(f.main, "worktree", "list", "--porcelain"), /primary\.sample/);
        assert.equal(git(f.main, "branch", "--list", "fix/sample"), keepBranch ? "fix/sample" : "");
        if (keepBranch) assert.equal(git(f.main, "rev-parse", "fix/sample"), head);
        assert.match(result.stdout, /cinexplorer-sample.*containers and volumes later/);
    });
}

for (const command of ["remove", "finish"]) {
    test(`${command} --no-stack still refuses an unexpected project`, (t) => {
        const f = fixture(t);
        const path = f.worktree();
        write(path, "infrastructure/.env", "COMPOSE_PROJECT_NAME=infrastructure\n");
        preserved(f, path, [command, "sample", "--no-stack"], /project.*cinexplorer-sample.*infrastructure/i);
    });
}

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

function runningIn(t, path) {
    const child = spawn("sleep", ["60"], { cwd: path, stdio: "ignore" });
    t.after(() => child.kill());
    return child.pid;
}

for (const command of ["remove", "finish"]) {
    test(`${command} refuses while a process runs inside the worktree`, (t) => {
        const f = fixture(t);
        const path = f.worktree();
        write(path, "infrastructure/.env", BROWSE_ENV);
        const pid = runningIn(t, path);
        preserved(f, path, [command, "sample"], new RegExp(`running inside[\\s\\S]*${pid} sleep`));
    });
}

test("finish refuses a linked checkout before any change", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    refusal(f.invoke(path, ["finish", "sample"]), /main checkout/i);
    assert.equal(existsSync(path), true);
    assert.deepEqual(f.calls(), []);
});

for (const scenario of ["another branch", "changed tracked files"]) {
    test(`finish refuses a main checkout on ${scenario} before any change`, (t) => {
        const f = fixture(t);
        const path = f.worktree();
        write(path, "infrastructure/.env", BROWSE_ENV);
        if (scenario === "another branch") git(f.main, "switch", "-q", "-c", "chore/elsewhere");
        else write(f.main, ".worktreeinclude", "changed\n");
        preserved(f, path, ["finish", "sample"], scenario === "another branch" ? /must be on main/ : /uncommitted changes/);
    });
}

test("finish refuses an unmerged branch before its closing steps", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    git(path, "commit", "-q", "--allow-empty", "-m", "unmerged work");
    preserved(f, path, ["finish", "sample"], /not merged/);
});

test("finish updates main, runs the closing steps around removal and deletes the merged remote branch", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    git(path, "push", "-q", "origin", "fix/sample");
    git(f.main, "commit", "-q", "--allow-empty", "-m", "merged on origin");
    git(f.main, "push", "-q", "origin", "main");
    git(f.main, "reset", "-q", "--hard", "HEAD~1");
    const result = f.invoke(f.main, ["finish", "sample"]);
    success(result);
    const closing = (phase, present) => ({ command: "closing", args: [phase, "sample"], cwd: f.main, present });
    assert.deepEqual(f.calls().map((call) => (call.command === "docker" ? call.args[0] : call)), [
        closing("before-remove", true), "container", "volume", "network", "image", closing("after-remove", false),
    ]);
    assert.equal(git(f.main, "rev-parse", "HEAD"), git(f.main, "rev-parse", "origin/main"));
    assert.equal(git(f.main, "ls-remote", "--heads", "origin", "fix/sample"), "");
    assert.equal(git(f.main, "branch", "--list", "fix/sample"), "");
    assert.equal(existsSync(path), false);
    assert.match(result.stdout, /closing before-remove[\s\S]*Deleted remote branch fix\/sample[\s\S]*closing after-remove/);
});

test("finish --no-stack runs all closing steps without Docker", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    git(path, "push", "-q", "origin", "fix/sample");
    git(f.main, "commit", "-q", "--allow-empty", "-m", "merged on origin");
    git(f.main, "push", "-q", "origin", "main");
    git(f.main, "reset", "-q", "--hard", "HEAD~1");
    const result = f.invoke(f.main, ["finish", "sample", "--no-stack"], { CX_FAIL: "docker" });
    success(result);
    assert.deepEqual(f.calls(), [
        { command: "closing", args: ["before-remove", "sample"], cwd: f.main, present: true },
        { command: "closing", args: ["after-remove", "sample"], cwd: f.main, present: false },
    ]);
    assert.equal(git(f.main, "rev-parse", "HEAD"), git(f.main, "rev-parse", "origin/main"));
    assert.equal(git(f.main, "ls-remote", "--heads", "origin", "fix/sample"), "");
    assert.equal(git(f.main, "branch", "--list", "fix/sample"), "");
    assert.equal(existsSync(path), false);
    assert.match(result.stdout, /cinexplorer-sample.*containers and volumes later/);
});

test("finish reports a remote branch already deleted", (t) => {
    const f = fixture(t);
    f.worktree();
    const result = f.invoke(f.main, ["finish", "sample"]);
    success(result);
    assert.match(result.stdout, /fix\/sample is already gone/);
});

test("finish keeps a remote branch whose head is not on main", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    git(path, "commit", "-q", "--allow-empty", "-m", "pushed but never merged");
    git(path, "push", "-q", "origin", "fix/sample");
    const pushed = git(path, "rev-parse", "HEAD");
    git(path, "reset", "-q", "--hard", "HEAD~1");
    const result = f.invoke(f.main, ["finish", "sample"]);
    success(result);
    assert.match(result.stdout, /Kept remote branch fix\/sample/);
    assert.match(git(f.main, "ls-remote", "--heads", "origin", "fix/sample"), new RegExp(pushed));
    assert.equal(existsSync(path), false);
});

test("a closing-step refusal before removal keeps the worktree and says how to resume", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    const result = f.invoke(f.main, ["finish", "sample"], { CX_CLOSING_FAIL: "before-remove" });
    refusal(result, /closing step refused/);
    assert.match(result.stderr, /Nothing was removed.*finish sample again/);
    assert.equal(existsSync(path), true);
    assert.equal(git(path, "branch", "--show-current"), "fix/sample");
    assert.deepEqual(f.calls().map((call) => call.command), ["closing"]);
});

test("a closing-step failure after removal names the step to run again", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    const result = f.invoke(f.main, ["finish", "sample"], { CX_CLOSING_FAIL: "after-remove" });
    refusal(result, /closing step refused/);
    assert.match(result.stderr, /worktree is removed.*finish-work\.mjs after-remove sample/);
    assert.equal(existsSync(path), false);
});

test("finish warns and still archives when the remote branch cannot be deleted", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    git(path, "push", "-q", "origin", "fix/sample");
    write(f.origin, "hooks/pre-receive", "#!/bin/sh\nwhile read old new ref; do\n  case $new in 0000000000000000000000000000000000000000) echo 'deletes refused'; exit 1;; esac\ndone\n");
    execFileSync("chmod", ["+x", join(f.origin, "hooks/pre-receive")]);
    const result = f.invoke(f.main, ["finish", "sample"]);
    success(result);
    assert.match(result.stdout, /Could not delete remote branch fix\/sample[\s\S]*git push origin --delete fix\/sample/);
    assert.deepEqual(f.calls().at(-1).args, ["after-remove", "sample"]);
    assert.notEqual(git(f.main, "ls-remote", "--heads", "origin", "fix/sample"), "");
});

test("finish says how to resume when removal stops partway", (t) => {
    const f = fixture(t);
    const path = f.worktree();
    write(path, "infrastructure/.env", BROWSE_ENV);
    const result = f.invoke(f.main, ["finish", "sample"], { CX_IDS: "first", CX_FAIL: "rm" });
    refusal(result, /stub command failed: rm/);
    assert.match(result.stderr, /stopped partway[\s\S]*finish sample again[\s\S]*after-remove sample/);
    assert.equal(existsSync(path), true);
    assert.equal(f.calls().some((call) => call.command === "closing" && call.args[0] === "after-remove"), false);
});
