// Post-compaction recovery for legacy ARC, for Claude Code and Codex.
//
// Compaction drops context silently, so after one the agent is told to re-read the
// session and process documents and is given the live repository state.
//
// Session state lives in the gitignored personal workspace (.arc/user/README.md): a work
// unit's SESSION-NOTES.md in the checkout that runs it, and WORKING-MEMORY.md and
// USER-INBOX.md in the main checkout. A linked worktree resolves the main checkout through
// git's common directory.
//
//   claude-session-start   Claude Code SessionStart(compact): inject immediately.
//   codex-arm              Codex PreCompact: arm a one-shot marker for the session.
//   codex-claim <event>    Codex PostToolUse / UserPromptSubmit: claim the marker
//                          and inject once; the rename makes the claim atomic.
//   codex-clear            Codex SessionStart(clear): disarm, nothing to recover.
//
// A hook must never block the harness: every failure exits 0 without output.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { activeErrand, errandCommand } from "./errand-session.mjs";

const MARKER_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_LISTED_CHANGES = 10;
const BASE_BRANCH = "main";
const NOTE_FIELDS = [
    "State",
    "Branch",
    "Task List",
    "Next Task",
    "Last Completed",
    "Blockers",
    "Next Action",
    "Commit at Handoff",
];

const args = process.argv.slice(2);
if (args[0]?.startsWith("errand-")) {
    try {
        process.stdout.write(`${JSON.stringify(errandCommand(process.cwd(), args[0], args[1]))}\n`);
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
} else {
    try {
        main(args);
    } catch {
        // Fall through: recovery is best effort and must not fail the hook.
    }
}

function main([command, event]) {
    const { sessionId, agentId } = readHookInput();
    // A subagent's payload carries its parent's session; it must not arm, claim or
    // clear the parent's recovery.
    if (agentId !== null) return;

    const root = git(process.env.CLAUDE_PROJECT_DIR || process.cwd(), ["rev-parse", "--show-toplevel"]);
    if (root === null) return;

    switch (command) {
        case "claude-session-start":
            emit("SessionStart", recoveryContext(root, sessionId), true);
            return;
        case "codex-arm":
            reapStaleMarkers(root);
            writeFileSync(markerPath(root, sessionId, "pending"), `${new Date().toISOString()}\n`);
            return;
        case "codex-claim":
            if (claimMarker(root, sessionId)) {
                // Codex rejects suppressOutput on PostToolUse output.
                const hookEvent = event === "user-prompt-submit" ? "UserPromptSubmit" : "PostToolUse";
                emit(hookEvent, recoveryContext(root, sessionId), hookEvent !== "PostToolUse");
            }
            return;
        case "codex-clear":
            rmSync(markerPath(root, sessionId, "pending"), { force: true });
            return;
    }
}

function readHookInput() {
    let parsed = {};
    try {
        parsed = JSON.parse(readFileSync(0, "utf8"));
    } catch {
        // Empty or non-JSON stdin degrades to the sessionless scope.
    }
    return { sessionId: nonEmpty(parsed?.session_id) ?? "no-session", agentId: nonEmpty(parsed?.agent_id) };
}

function nonEmpty(value) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function emit(hookEventName, additionalContext, suppressOutput) {
    const output = { hookSpecificOutput: { hookEventName, additionalContext } };
    if (suppressOutput) output.suppressOutput = true;
    process.stdout.write(`${JSON.stringify(output)}\n`);
}

// Markers stay in shared Git metadata; a session can arm and claim from different checkouts.
function markerDir(root) {
    const dir = join(git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]), "legacy-arc-recovery");
    mkdirSync(dir, { recursive: true });
    return dir;
}

function markerPath(root, sessionId, state) {
    const safeId = createHash("sha256").update(sessionId).digest("hex");
    return join(markerDir(root), `${safeId}.${state}`);
}

function claimMarker(root, sessionId) {
    const claimed = markerPath(root, sessionId, `claimed-${process.pid}`);
    try {
        renameSync(markerPath(root, sessionId, "pending"), claimed);
    } catch {
        return false;
    }
    rmSync(claimed, { force: true });
    return true;
}

function reapStaleMarkers(root) {
    const dir = markerDir(root);
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (Date.now() - statSync(path).mtimeMs > MARKER_MAX_AGE_MS) rmSync(path, { force: true });
    }
}

function recoveryContext(home, sessionId) {
    try {
        const errand = activeErrand(home, sessionId);
        if (errand === null) return buildContext(home);
        return [
            `Active isolated errand: ${errand.checkout}`,
            `Session home: ${errand.home}; its work unit remains paused.`,
            "Direct all errand commands to the active checkout and use absolute paths for reads and edits.",
            `Re-read ${join(errand.checkout, ".arc/reference/workflows/supplemental/run-errand.md")}.`,
            buildContext(errand.checkout, true),
        ].join("\n");
    } catch (error) {
        return `STOP: isolated errand recovery could not resolve the active checkout. ${error.message}\n`
            + "Do not resume the session home's work unit or remove a checkout until this is resolved.\n";
    }
}

function buildContext(root, absolutePaths = false) {
    const branch = git(root, ["branch", "--show-current"]) || null;
    const session = resolveSession(root, branch);

    const reads = [];
    const readPath = (path) => absolutePaths ? path : display(root, path);
    if (session.notesPath) reads.push(readPath(session.notesPath));
    if (session.workingMemory) reads.push(readPath(session.workingMemory));
    reads.push(...[".arc/reference/constitution/DEVELOPMENT-RULES.md", ".arc/reference/workflows/3_process-task-loop.md"]
        .map((path) => absolutePaths ? join(root, path) : path));
    if (session.taskList) reads.push(`${readPath(session.taskList)} (overview and the current task)`);

    const lines = [
        "=== CineXplorer post-compaction recovery (legacy ARC) ===",
        "Compaction drops context silently, so recover before continuing even if your context feels sufficient.",
        "Re-read in full:",
        ...reads.map((path, index) => `${index + 1}. ${path}`),
        "Use those documents as the procedural floor and the compacted summary only for the current work locus.",
        "",
        "Live repository state:",
        ...liveState(root, branch, session),
    ];

    if (session.fields.size > 0) {
        lines.push("", "The session notes record:");
        for (const [field, value] of session.fields) lines.push(`- ${field}: ${value}`);
    }
    return `${lines.join("\n")}\n`;
}

// Branch {type}/{name} names the work unit; its notes sit under the identity folder of the
// main checkout's workspace, and its task list anywhere under .arc/active/.
function resolveSession(root, branch) {
    const main = mainCheckout(root);
    const session = {
        branch,
        candidate: branch?.includes("/") ? branch.slice(branch.indexOf("/") + 1) : null,
        identity: resolveIdentity(main),
        notesPath: null,
        fields: new Map(),
        workingMemory: null,
        inbox: null,
        taskList: null,
    };

    if (session.identity.name) {
        const workspace = join(main, ".arc/user", session.identity.name);
        session.workingMemory = existingPath(join(workspace, "WORKING-MEMORY.md"));
        session.inbox = existingPath(join(workspace, "USER-INBOX.md"));
        if (session.candidate) {
            session.notesPath = existingPath(join(root, ".arc/user", session.identity.name, session.candidate,
                "SESSION-NOTES.md"));
        }
    }
    if (session.notesPath) session.fields = readNoteFields(session.notesPath);

    if (session.candidate) {
        const named = session.fields.get("Task List")?.match(/tasks-[^\s`/]+\.md/)?.[0];
        session.taskList = findTaskList(root, named ?? `tasks-${session.candidate}.md`);
    }
    return session;
}

function mainCheckout(root) {
    const commonDir = git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
    return commonDir ? dirname(commonDir) : root;
}

function resolveIdentity(main) {
    let folders = [];
    try {
        folders = readdirSync(join(main, ".arc/user"), { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
    } catch {
        // No workspace at all reads the same as an empty one.
    }
    if (folders.length === 1) return { name: folders[0] };
    if (folders.length === 0) return { problem: "no folder under .arc/user/ in the main checkout" };
    return { problem: `several folders under .arc/user/ in the main checkout (${folders.join(", ")})` };
}

function findTaskList(root, fileName) {
    try {
        for (const entry of readdirSync(join(root, ".arc/active"), { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const path = join(root, ".arc/active", entry.name, fileName);
            if (existsSync(path)) return path;
        }
    } catch {
        // No active work at all.
    }
    return null;
}

function readNoteFields(notesPath) {
    const fields = new Map();
    for (const line of readFileSync(notesPath, "utf8").split(/\r?\n/)) {
        if (line.startsWith("## ")) break;
        const match = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
        if (match && NOTE_FIELDS.includes(match[1]) && !fields.has(match[1])) fields.set(match[1], match[2].trim());
    }
    return fields;
}

function liveState(root, branch, session) {
    const upstream = git(root, ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]);
    const [behind, ahead] = upstream ? upstream.split(/\s+/) : [];
    const head = git(root, ["log", "-1", "--format=%h %s"]) ?? "(no commits)";
    const changes = (git(root, ["status", "--porcelain"]) ?? "").split("\n").filter(Boolean);

    const tracking = upstream ? ` (ahead ${ahead}, behind ${behind} of upstream)` : " (no upstream)";
    const state = [
        `- Checkout: ${root}`,
        `- Branch: ${branch ?? "(detached HEAD)"}${tracking}`,
        `- HEAD: ${head}`,
        `- Uncommitted changes: ${changes.length}`,
        ...changes.slice(0, MAX_LISTED_CHANGES).map((line) => `    ${line}`),
    ];
    if (changes.length > MAX_LISTED_CHANGES) state.push(`    ... and ${changes.length - MAX_LISTED_CHANGES} more`);

    state.push(`- Work unit: ${describeWorkUnit(session)}`);
    if (session.identity.problem) state.push(`- Identity: ${session.identity.problem}`);
    if (session.notesPath) state.push(`- ${describeHandoff(root, session.fields.get("Commit at Handoff"))}`);
    if (session.inbox) state.push(`- Inbox: ${display(root, session.inbox)}`);

    const recordedBranch = firstToken(session.fields.get("Branch"));
    if (recordedBranch && branch && recordedBranch !== branch) {
        state.push(
            `- MISMATCH: the session notes record branch ${recordedBranch}, but the checkout is on ${branch}.`
                + " Stop, report it, and ask the Owner (session-init.md).",
        );
    }
    return state;
}

function describeWorkUnit(session) {
    if (!session.branch) return "none (detached HEAD)";
    if (session.branch === BASE_BRANCH) return "none (between work units)";
    if (session.notesPath) return session.candidate;
    if (session.taskList) {
        return session.identity.name ? `${session.candidate} (no session notes yet)` : session.candidate;
    }
    return `none (no work unit on ${session.branch})`;
}

function describeHandoff(root, recorded) {
    const commit = firstToken(recorded);
    if (!commit || commit.startsWith("[")) return "No handoff recorded";
    const count = git(root, ["rev-list", "--count", `${commit}..HEAD`]);
    return count === null
        ? `Commit at Handoff ${commit} is not in this checkout's history`
        : `Commits since the handoff (${commit}): ${count}`;
}

// The first backticked token, or the first word: "`technical/x` (from `main`)" names technical/x.
function firstToken(value) {
    if (!value) return null;
    return value.match(/`([^`]+)`/)?.[1] ?? value.split(/\s+/)[0];
}

// Paths inside this checkout print relative; the main checkout's files print absolute.
function display(root, path) {
    const relativePath = relative(root, path);
    return relativePath.startsWith("..") || isAbsolute(relativePath) ? path : relativePath;
}

function existingPath(path) {
    return existsSync(path) ? path : null;
}

function git(cwd, args) {
    try {
        return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
        return null;
    }
}
