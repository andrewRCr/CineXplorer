import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "seed-session-notes.mjs");
const GIT_ENV = {
    ...process.env,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
};

function git(cwd, ...args) {
    return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function fixture(t, { identities = ["andrew"], branch = "technical/new-work" } = {}) {
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "cx-seed-notes-")));
    t.after(() => rmSync(parent, { recursive: true, force: true }));
    const main = join(parent, "main");
    const worktree = join(parent, "main.new-work");
    mkdirSync(main);
    git(main, "init", "-q", "-b", "primary");
    writeFileSync(join(main, ".gitignore"), ".arc/user/*/\n");
    git(main, "add", ".gitignore");
    git(main, "commit", "-q", "-m", "initial");
    mkdirSync(join(main, ".arc/user"), { recursive: true });
    writeFileSync(join(main, ".arc/user/README.md"), "# Workspace\n");
    for (const identity of identities) mkdirSync(join(main, ".arc/user", identity));
    git(main, "worktree", "add", "-q", "-b", branch, worktree);
    return { main, worktree };
}

function seed(cwd) {
    return spawnSync(process.execPath, [SCRIPT], { cwd, env: GIT_ENV, encoding: "utf8" });
}

function refuse(cwd, reason) {
    const result = seed(cwd);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, reason);
}

test("refuses the main checkout without creating notes", (t) => {
    const { main, worktree } = fixture(t);
    refuse(main, /main checkout/i);
    assert.deepEqual(readdirSync(join(main, ".arc/user/andrew")), []);
    assert.equal(existsSync(join(worktree, ".arc/user")), false);
});

for (const identities of [[], ["zoe", "ann"]]) {
    test(`refuses an ambiguous identity: ${identities.join(", ") || "none"}`, (t) => {
        const { worktree } = fixture(t, { identities });
        refuse(worktree, identities.length ? /several folders.*ann, zoe/i : /no folder/i);
        assert.equal(existsSync(join(worktree, ".arc/user")), false);
    });
}

test("refuses a detached HEAD without creating notes", (t) => {
    const { worktree } = fixture(t);
    git(worktree, "checkout", "-q", "--detach");
    refuse(worktree, /detached/i);
    assert.equal(existsSync(join(worktree, ".arc/user")), false);
});

for (const branch of ["main", "Technical/x", "technical/-x", "technical/a/b"]) {
    test(`refuses the malformed branch ${branch}`, (t) => {
        const { worktree } = fixture(t, { branch });
        refuse(worktree, /branch.*\{type\}\/\{name\}/i);
        assert.equal(existsSync(join(worktree, ".arc/user")), false);
    });
}

test("keeps existing notes byte for byte", (t) => {
    const { main, worktree } = fixture(t);
    const folder = join(worktree, ".arc/user/andrew/new-work");
    mkdirSync(folder, { recursive: true });
    const notes = join(folder, "SESSION-NOTES.md");
    const original = Buffer.from("Existing notes\r\n\0");
    writeFileSync(notes, original);
    refuse(worktree, /already exists/i);
    assert.deepEqual(readFileSync(notes), original);
    assert.deepEqual(readdirSync(join(main, ".arc/user/andrew")), []);
});

test("writes the planning skeleton in the worktree and prints its path", (t) => {
    const { main, worktree } = fixture(t);
    const result = seed(worktree);
    assert.equal(result.status, 0, result.stderr);
    const notes = join(worktree, ".arc/user/andrew/new-work/SESSION-NOTES.md");
    assert.equal(result.stdout.trim(), notes);
    assert.equal(readFileSync(notes, "utf8"), [
        "# Session Notes: new-work", "",
        "**State:** planning",
        "**Branch:** `technical/new-work`",
        "**Task List:** [none yet]",
        "**Next Task:** [none yet]",
        "**Last Completed:** [none]",
        "**Blockers:** [none]",
        "**Next Action:** draft the design (`1a_draft-design.md`)",
        "**Commit at Handoff:** [none yet]", "",
        "## Uncommitted Work", "", "[none]", "",
        "## Remaining Work Before Returning to Task List", "", "[none]", "",
        "## Additional Context", "", "[none]", "",
    ].join("\n"));
    assert.deepEqual(readdirSync(join(main, ".arc/user/andrew")), []);
});
