import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
    existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync,
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
    const project = process.env.CX_PROJECT || env.match(/^COMPOSE_PROJECT_NAME=(.*)$/m)?.[1];
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
