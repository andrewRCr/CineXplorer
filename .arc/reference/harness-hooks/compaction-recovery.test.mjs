// Tests for compaction-recovery.mjs. Run with: node --test .arc/reference/harness-hooks/compaction-recovery.test.mjs
//
// Each test builds a throwaway repository in a temp directory, arranges the session files a
// checkout can have, and reads the recovery context the hook would inject after a compaction.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
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

// The "- Field: value" lines printed under "The session notes record:", in order.
function notesBlock(context) {
    const lines = context.split("\n");
    const start = lines.indexOf("The session notes record:");
    if (start === -1) return [];
    const block = [];
    for (let i = start + 1; (lines[i] ?? "").startsWith("- "); i += 1) block.push(lines[i]);
    return block;
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
    assert.deepEqual(notesBlock(context), [
        "- State: executing",
        "- Branch: `technical/demo`",
        "- Task List: `tasks-demo.md`",
        "- Next Task: 2.1 Write the thing",
        "- Last Completed: 1.3 Read the thing",
        "- Blockers: [none]",
        "- Next Action: Task 2.1: start the thing",
        `- Commit at Handoff: \`${handoff}\``,
    ]);
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
    assert.deepEqual(notesBlock(context).slice(1, 3), ["- Branch: `technical/side`", "- Task List: `tasks-side.md`"]);
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


function errandRecord(root, sessionId, checkout, branch = "chore/errand") {
    const key = createHash("sha256").update(sessionId).digest("hex");
    write(root, `.git/legacy-arc-errands/${key}.json`, JSON.stringify({
        version: 1, home: root, checkout, branch,
    }));
}

function isolatedErrand(t) {
    const root = repository(t);
    startWorkUnit(root, "technical/paused", "paused");
    writeNotes(root, "me", "paused", { branch: "`technical/paused`" });
    write(root, ".arc/user/me/WORKING-MEMORY.md", "# Working Memory\n");
    const checkout = join(tempDir(t), "errand");
    git(root, "worktree", "add", "-q", "-b", "chore/errand", checkout, "main");
    return { root, checkout };
}

function hookCommand(root, command, sessionId, ...args) {
    return execFileSync(process.execPath, [HOOK, command, ...args], {
        cwd: root,
        input: JSON.stringify({ session_id: sessionId }),
        env: { ...GIT_ENV, CLAUDE_PROJECT_DIR: root, CODEX_THREAD_ID: sessionId, CODEX_SESSION_ID: sessionId },
        encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
    });
}

test("primary-anchored recovery follows this session's errand without reading the paused work unit", (t) => {
    const { root, checkout } = isolatedErrand(t);
    errandRecord(root, "isolated-session", checkout);

    const output = hookCommand(root, "claude-session-start", "isolated-session");
    const context = JSON.parse(output).hookSpecificOutput.additionalContext;

    assert.ok(context.includes(`Checkout: ${checkout}`));
    assert.ok(context.includes(`${checkout}/.arc/reference/constitution/DEVELOPMENT-RULES.md`));
    assert.match(context, /Branch: chore\/errand/);
    assert.doesNotMatch(context, /tasks-paused|paused\/SESSION-NOTES|Next Task: 2\.1/);
    assert.equal(git(root, "branch", "--show-current"), "technical/paused");
});

test("Codex can arm from home and claim from the active checkout exactly once", (t) => {
    const { root, checkout } = isolatedErrand(t);
    errandRecord(root, "moving-session", checkout);
    assert.equal(hookCommand(root, "codex-arm", "moving-session"), "");
    const output = hookCommand(checkout, "codex-claim", "moving-session", "post-tool-use");
    assert.notEqual(output, "", "recovery must survive a change in the command checkout");
    const recovered = JSON.parse(output);
    assert.equal(recovered.hookSpecificOutput.hookEventName, "PostToolUse");
    assert.equal(recovered.suppressOutput, undefined);
    assert.ok(recovered.hookSpecificOutput.additionalContext.includes(`Checkout: ${checkout}`));
    assert.equal(hookCommand(root, "codex-claim", "moving-session", "user-prompt-submit"), "");
});

test("session identifiers that differ only by punctuation do not share recovery markers", (t) => {
    const root = repository(t);
    hookCommand(root, "codex-arm", "session/a");
    assert.equal(hookCommand(root, "codex-claim", "session_a", "post-tool-use"), "");
    assert.notEqual(hookCommand(root, "codex-claim", "session/a", "user-prompt-submit"), "");
});

test("enter and return preserve the primary and keep other sessions independent", (t) => {
    const { root, checkout } = isolatedErrand(t);
    const head = git(root, "rev-parse", "HEAD");
    const status = git(root, "status", "--porcelain");
    const entered = hookCommand(root, "errand-enter", "owner", checkout);
    assert.match(entered, /"state":"errand"/, "enter must select an execution checkout");
    assert.equal(JSON.parse(entered).checkoutPath, checkout);
    assert.equal(JSON.parse(hookCommand(root, "errand-status", "owner")).checkoutPath, checkout);
    assert.equal(JSON.parse(hookCommand(root, "errand-status", "other")).checkoutPath, root);
    const otherContext = JSON.parse(hookCommand(root, "claude-session-start", "other"))
        .hookSpecificOutput.additionalContext;
    assert.match(otherContext, /Branch: technical\/paused/);
    assert.deepEqual(JSON.parse(hookCommand(root, "errand-return", "owner")), { state: "home", checkoutPath: root });
    assert.equal(JSON.parse(hookCommand(root, "errand-status", "owner")).checkoutPath, root);
    assert.equal(git(root, "rev-parse", "HEAD"), head);
    assert.equal(git(root, "status", "--porcelain"), status);
    assert.equal(git(root, "branch", "--show-current"), "technical/paused");
});

test("enter refuses replacing an active errand or selecting a different repository", (t) => {
    const { root, checkout } = isolatedErrand(t);
    const second = join(tempDir(t), "second");
    git(root, "worktree", "add", "-q", "-b", "chore/second", second, "main");
    hookCommand(root, "errand-enter", "owner", checkout);
    assert.throws(() => hookCommand(root, "errand-enter", "owner", second), /already has an active errand/);
    assert.equal(JSON.parse(hookCommand(root, "errand-status", "owner")).checkoutPath, checkout);
    hookCommand(root, "errand-return", "owner");
    const foreign = repository(t);
    git(foreign, "checkout", "-q", "-b", "chore/foreign");
    assert.throws(() => hookCommand(root, "errand-enter", "owner", foreign), /different registered checkout/);
});

test("a removed errand stops recovery until an explicit return", (t) => {
    const { root, checkout } = isolatedErrand(t);
    errandRecord(root, "owner", checkout);
    git(root, "worktree", "remove", checkout);
    const context = JSON.parse(hookCommand(root, "claude-session-start", "owner"))
        .hookSpecificOutput.additionalContext;
    assert.match(context, /STOP: isolated errand recovery/);
    assert.doesNotMatch(context, /tasks-paused|paused\/SESSION-NOTES|Branch: technical\/paused/);
    const returned = hookCommand(root, "errand-return", "owner");
    assert.match(returned, /"state":"home"/);
    assert.equal(JSON.parse(hookCommand(root, "errand-status", "owner")).checkoutPath, root);
});

test("a changed errand branch stops recovery instead of adopting unrelated work", (t) => {
    const { root, checkout } = isolatedErrand(t);
    errandRecord(root, "owner", checkout);
    git(checkout, "checkout", "-q", "-b", "chore/replaced");
    const context = JSON.parse(hookCommand(root, "claude-session-start", "owner"))
        .hookSpecificOutput.additionalContext;
    assert.match(context, /STOP: isolated errand recovery/);
    assert.doesNotMatch(context, /Branch: chore\/replaced|paused\/SESSION-NOTES/);
});

test("foreign and malformed active records produce a scope warning without primary notes", (t) => {
    const { root } = isolatedErrand(t);
    const foreign = repository(t);
    errandRecord(root, "owner", foreign, "main");
    let context = JSON.parse(hookCommand(root, "claude-session-start", "owner"))
        .hookSpecificOutput.additionalContext;
    assert.match(context, /STOP: isolated errand recovery/);
    assert.doesNotMatch(context, /paused\/SESSION-NOTES/);
    const key = createHash("sha256").update("owner").digest("hex");
    write(root, `.git/legacy-arc-errands/${key}.json`, "{broken");
    context = JSON.parse(hookCommand(root, "claude-session-start", "owner"))
        .hookSpecificOutput.additionalContext;
    assert.match(context, /STOP: isolated errand recovery/);
    assert.doesNotMatch(context, /paused\/SESSION-NOTES/);
});

test("entry requires a known session identifier and return must run from the session home", (t) => {
    const { root, checkout } = isolatedErrand(t);
    assert.throws(() => hookCommand(root, "errand-enter", "", checkout), /CODEX_THREAD_ID or CODEX_SESSION_ID is required/);
    hookCommand(root, "errand-enter", "owner", checkout);
    assert.throws(() => hookCommand(checkout, "errand-return", "owner"), /Return from the session home/);
    assert.equal(JSON.parse(hookCommand(root, "errand-status", "owner")).checkoutPath, checkout);
});


test("the installed hook survives removal of its source worktree and preserves other hooks", (t) => {
    const { root, checkout } = isolatedErrand(t);
    write(root, ".codex/hooks.json", JSON.stringify({ hooks: {
        UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo other-hook" }] }],
    } }));
    const harness = ".arc/reference/harness-hooks";
    for (const file of ["compaction-recovery.mjs", "errand-session.mjs", "install-errand-harness.mjs"]) {
        mkdirSync(join(checkout, harness), { recursive: true });
        copyFileSync(join(dirname(HOOK), file), join(checkout, harness, file));
    }
    const skillSource = join(dirname(HOOK), "../agent/skills/errand/SKILL.md");
    write(checkout, ".arc/reference/agent/skills/errand/SKILL.md", readFileSync(skillSource, "utf8"));
    git(checkout, "add", ".");
    git(checkout, "commit", "-q", "-m", "harness fixture");
    const before = git(root, "status", "--porcelain", "--untracked-files=no");
    execFileSync(process.execPath, [join(checkout, harness, "install-errand-harness.mjs")], { env: GIT_ENV });
    const hooks = JSON.parse(readFileSync(join(root, ".codex/hooks.json"), "utf8"));
    assert.ok(hooks.hooks.UserPromptSubmit.some((entry) => entry.hooks.some((hook) => hook.command === "echo other-hook")));
    assert.ok(readFileSync(join(root, ".codex/skills/errand/SKILL.md"), "utf8").includes("name: errand"));
    execFileSync(process.execPath, [join(checkout, harness, "install-errand-harness.mjs")], { env: GIT_ENV });
    assert.deepEqual(JSON.parse(readFileSync(join(root, ".codex/hooks.json"), "utf8")), hooks);
    const installed = join(root, ".codex/hooks/legacy-arc/compaction-recovery.mjs");
    const options = {
        cwd: root, input: JSON.stringify({ session_id: "owner" }),
        env: { ...GIT_ENV, CODEX_THREAD_ID: "owner", CODEX_SESSION_ID: "owner" }, encoding: "utf8",
    };
    execFileSync(process.execPath, [installed, "errand-enter", checkout], options);
    const arm = hooks.hooks.PreCompact[0].hooks[0].command;
    const claim = hooks.hooks.PostToolUse[0].hooks[0].command;
    execFileSync("bash", ["-c", arm], options);
    const recovered = JSON.parse(execFileSync("bash", ["-c", claim], options));
    assert.ok(recovered.hookSpecificOutput.additionalContext.includes(`Checkout: ${checkout}`));
    assert.doesNotMatch(recovered.hookSpecificOutput.additionalContext, /paused\/SESSION-NOTES/);
    execFileSync(process.execPath, [installed, "errand-return"], options);
    // The source checkout can disappear; the installed hook imports only its local sibling module.
    git(root, "worktree", "remove", checkout);
    const output = execFileSync(process.execPath, [installed, "errand-status"], {
        cwd: root, env: { ...GIT_ENV, CODEX_THREAD_ID: "owner", CODEX_SESSION_ID: "owner" }, encoding: "utf8",
    });
    assert.deepEqual(JSON.parse(output), { state: "home", checkoutPath: root });
    assert.equal(git(root, "status", "--porcelain", "--untracked-files=no"), before);
});
