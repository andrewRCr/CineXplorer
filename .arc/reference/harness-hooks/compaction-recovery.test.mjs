// Tests for compaction-recovery.mjs. Run with: node --test .arc/reference/harness-hooks/compaction-recovery.test.mjs
//
// Each test builds a throwaway repository in a temp directory, arranges the session files a
// checkout can have, and reads the recovery context the hook would inject after a compaction.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = join(dirname(fileURLToPath(import.meta.url)), "compaction-recovery.mjs");

// Isolate fixture repositories from the developer's git configuration and hooks.
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

function write(root, relativePath, text) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
}

function tempDir(t) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "cx-recovery-")));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    return dir;
}

function repository(t) {
    const root = tempDir(t);
    git(root, "init", "-q", "-b", "main");
    write(root, ".gitignore", ".arc/user/*/\n");
    write(root, ".arc/user/README.md", "# Personal Workspace\n");
    git(root, "add", ".");
    git(root, "commit", "-q", "-m", "initial");
    return root;
}

// Starts a work-unit branch whose task list is tracked, as activation leaves it.
function startWorkUnit(root, branch, name) {
    git(root, "checkout", "-q", "-b", branch);
    write(root, `.arc/active/technical/tasks-${name}.md`, `# Task List: ${name}\n`);
    git(root, "add", ".");
    git(root, "commit", "-q", "-m", `plan ${name}`);
}

function commit(root, message) {
    git(root, "commit", "-q", "--allow-empty", "-m", message);
}

function sessionNotes({ name, branch, commitAtHandoff = "[none yet]" }) {
    return [
        `# Session Notes: ${name}`,
        "",
        "**State:** executing",
        `**Branch:** ${branch}`,
        `**Task List:** \`tasks-${name}.md\``,
        "**Next Task:** 2.1 Write the thing",
        "**Last Completed:** 1.3 Read the thing",
        "**Blockers:** [none]",
        "**Next Action:** Task 2.1: start the thing",
        `**Commit at Handoff:** ${commitAtHandoff}`,
        "",
        "## Uncommitted Work",
        "",
        "[none]",
        "",
    ].join("\n");
}

function writeNotes(checkout, identity, name, fields) {
    write(checkout, `.arc/user/${identity}/${name}/SESSION-NOTES.md`, sessionNotes({ name, ...fields }));
}

function recover(checkout) {
    const output = execFileSync(process.execPath, [HOOK, "claude-session-start"], {
        input: "{}",
        env: { ...GIT_ENV, CLAUDE_PROJECT_DIR: checkout },
        encoding: "utf8",
    });
    return JSON.parse(output).hookSpecificOutput.additionalContext;
}

function rereadList(context) {
    const lines = context.split("\n");
    const start = lines.indexOf("Re-read in full:") + 1;
    const list = [];
    for (let i = start; /^\d+\. /.test(lines[i] ?? ""); i += 1) list.push(lines[i].replace(/^\d+\. /, ""));
    return list;
}

test("a work unit with notes: pointer fields, commits since the handoff, task list and working memory", (t) => {
    const root = repository(t);
    startWorkUnit(root, "technical/demo", "demo");
    const handoff = git(root, "rev-parse", "--short", "HEAD");
    commit(root, "work one");
    commit(root, "work two");
    write(root, ".arc/user/me/WORKING-MEMORY.md", "# Working Memory\n");
    writeNotes(root, "me", "demo", { branch: "`technical/demo`", commitAtHandoff: `\`${handoff}\`` });

    const context = recover(root);

    assert.deepEqual(rereadList(context).slice(0, 2), [
        ".arc/user/me/demo/SESSION-NOTES.md",
        ".arc/user/me/WORKING-MEMORY.md",
    ]);
    assert.ok(rereadList(context).some((line) => line.startsWith(".arc/active/technical/tasks-demo.md")));
    assert.match(context, /Work unit: demo\n/);
    assert.match(context, new RegExp(`Commits since the handoff \\(${handoff}\\): 2\\n`));
    assert.match(context, /- Next Action: Task 2\.1: start the thing\n/);
    assert.match(context, /- State: executing\n/);
    assert.doesNotMatch(context, /MISMATCH/);
});

test("main with no notes: between work units, pointing at working memory and the inbox", (t) => {
    const root = repository(t);
    write(root, ".arc/user/me/WORKING-MEMORY.md", "# Working Memory\n");
    write(root, ".arc/user/me/USER-INBOX.md", "# User Inbox\n");

    const context = recover(root);

    assert.match(context, /Work unit: none \(between work units\)\n/);
    assert.ok(rereadList(context).includes(".arc/user/me/WORKING-MEMORY.md"));
    assert.match(context, /Inbox: \.arc\/user\/me\/USER-INBOX\.md\n/);
    assert.doesNotMatch(context, /SESSION-NOTES/);
});

test("a linked worktree reads its own notes and the main checkout's working memory and inbox", (t) => {
    const root = repository(t);
    write(root, ".arc/user/me/WORKING-MEMORY.md", "# Working Memory\n");
    write(root, ".arc/user/me/USER-INBOX.md", "# User Inbox\n");
    startWorkUnit(root, "technical/side", "side");
    git(root, "checkout", "-q", "main");
    const worktree = join(tempDir(t), "side");
    git(root, "worktree", "add", "-q", worktree, "technical/side");
    writeNotes(worktree, "me", "side", { branch: "`technical/side`" });

    const context = recover(worktree);

    assert.deepEqual(rereadList(context).slice(0, 2), [
        ".arc/user/me/side/SESSION-NOTES.md",
        `${root}/.arc/user/me/WORKING-MEMORY.md`,
    ]);
    assert.match(context, new RegExp(`Inbox: ${root}/\\.arc/user/me/USER-INBOX\\.md\\n`));
    assert.match(context, /Work unit: side\n/);
});

test("a Branch field naming another branch is a mismatch; an annotated value naming this one is not", (t) => {
    const root = repository(t);
    startWorkUnit(root, "technical/demo", "demo");
    writeNotes(root, "me", "demo", { branch: "`technical/other`" });
    assert.match(recover(root), /MISMATCH: the session notes record branch technical\/other/);

    writeNotes(root, "me", "demo", { branch: "`technical/demo` (from `main`)" });
    assert.doesNotMatch(recover(root), /MISMATCH/);
});

test("a branch with no notes and no task list has no work unit", (t) => {
    const root = repository(t);
    write(root, ".arc/user/me/WORKING-MEMORY.md", "# Working Memory\n");
    git(root, "checkout", "-q", "-b", "fix/typo");

    const context = recover(root);

    assert.match(context, /Work unit: none \(no work unit on fix\/typo\)\n/);
    assert.doesNotMatch(context, /SESSION-NOTES/);
});

test("notes with no handoff yet say so instead of counting commits", (t) => {
    const root = repository(t);
    startWorkUnit(root, "technical/demo", "demo");
    writeNotes(root, "me", "demo", { branch: "`technical/demo`" });

    const context = recover(root);

    assert.match(context, /No handoff recorded\n/);
    assert.doesNotMatch(context, /Commits since the handoff/);
});

test("a detached HEAD has no work unit and reads no notes", (t) => {
    const root = repository(t);
    startWorkUnit(root, "technical/demo", "demo");
    writeNotes(root, "me", "demo", { branch: "`technical/demo`" });
    git(root, "checkout", "-q", "--detach");

    const context = recover(root);

    assert.match(context, /Work unit: none \(detached HEAD\)\n/);
    assert.doesNotMatch(context, /SESSION-NOTES/);
});

test("no identity folder is reported, not guessed", (t) => {
    const root = repository(t);
    startWorkUnit(root, "technical/demo", "demo");

    const context = recover(root);

    assert.match(context, /Identity: no folder under \.arc\/user\/ in the main checkout\n/);
    assert.doesNotMatch(context, /SESSION-NOTES|WORKING-MEMORY/);
});

test("several identity folders are reported, not guessed", (t) => {
    const root = repository(t);
    startWorkUnit(root, "technical/demo", "demo");
    writeNotes(root, "ann", "demo", { branch: "`technical/demo`" });
    writeNotes(root, "bob", "demo", { branch: "`technical/demo`" });

    const context = recover(root);

    assert.match(context, /Identity: several folders under \.arc\/user\/ in the main checkout \(ann, bob\)\n/);
    assert.doesNotMatch(context, /SESSION-NOTES/);
});

test("a task list without notes is named, with no session notes yet", (t) => {
    const root = repository(t);
    startWorkUnit(root, "incidental/cleanup", "cleanup");
    write(root, ".arc/user/me/WORKING-MEMORY.md", "# Working Memory\n");

    const context = recover(root);

    assert.match(context, /Work unit: cleanup \(no session notes yet\)\n/);
    assert.ok(rereadList(context).some((line) => line.startsWith(".arc/active/technical/tasks-cleanup.md")));
    assert.doesNotMatch(context, /SESSION-NOTES/);
});
