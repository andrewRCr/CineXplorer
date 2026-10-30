// Post-compaction recovery for legacy ARC, for Claude Code and Codex.
//
// Compaction drops context silently, so after one the agent is told to re-read the
// session and process documents and is given the live repository state.
//
//   claude-session-start   Claude Code SessionStart(compact): inject immediately.
//   codex-arm              Codex PreCompact: arm a one-shot marker for the session.
//   codex-claim <event>    Codex PostToolUse / UserPromptSubmit: claim the marker
//                          and inject once; the rename makes the claim atomic.
//   codex-clear            Codex SessionStart(clear): disarm, nothing to recover.
//
// A hook must never block the harness: every failure exits 0 without output.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MARKER_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_LISTED_CHANGES = 10;
const SESSION_FIELDS = ["Branch", "Task List", "Current Task", "Current Step", "Next Action"];

try {
    main(process.argv.slice(2));
} catch {
    // Fall through: recovery is best effort and must not fail the hook.
}
process.exit(0);

function main([command, event]) {
    const { sessionId, agentId } = readHookInput();
    // A subagent's payload carries its parent's session; it must not arm, claim or
    // clear the parent's recovery.
    if (agentId !== null) return;

    const root = git(process.env.CLAUDE_PROJECT_DIR || process.cwd(), ["rev-parse", "--show-toplevel"]);
    if (root === null) return;

    switch (command) {
        case "claude-session-start":
            emit("SessionStart", buildContext(root), true);
            return;
        case "codex-arm":
            reapStaleMarkers(root);
            writeFileSync(markerPath(root, sessionId, "pending"), `${new Date().toISOString()}\n`);
            return;
        case "codex-claim":
            if (claimMarker(root, sessionId)) {
                // Codex rejects suppressOutput on PostToolUse output.
                const hookEvent = event === "user-prompt-submit" ? "UserPromptSubmit" : "PostToolUse";
                emit(hookEvent, buildContext(root), hookEvent !== "PostToolUse");
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

// Markers live in the checkout's own git directory, so worktrees never share one.
function markerDir(root) {
    const dir = join(git(root, ["rev-parse", "--absolute-git-dir"]), "legacy-arc-recovery");
    mkdirSync(dir, { recursive: true });
    return dir;
}

function markerPath(root, sessionId, state) {
    const safeId = sessionId.replace(/[^A-Za-z0-9._-]/g, "_");
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

function buildContext(root) {
    const sessionPath = join(root, ".arc/active/CURRENT-SESSION.md");
    const sessionFields = readSessionFields(sessionPath);
    const taskList = sessionFields.get("Task List")?.match(/`?(\.arc\/[^\s`]+\.md)`?/)?.[1];

    const reads = [
        ".arc/active/CURRENT-SESSION.md",
        ".arc/reference/constitution/DEVELOPMENT-RULES.md",
        ".arc/reference/workflows/3_process-task-loop.md",
    ];
    if (taskList && existsSync(join(root, taskList))) reads.push(`${taskList} (overview and the current task)`);

    const lines = [
        "=== CineXplorer post-compaction recovery (legacy ARC) ===",
        "Compaction drops context silently, so recover before continuing even if your context feels sufficient.",
        "Re-read in full:",
        ...reads.map((path, index) => `${index + 1}. ${path}`),
        "Use those documents as the procedural floor and the compacted summary only for the current work locus.",
        "",
        "Live repository state:",
        ...liveState(root, sessionFields),
    ];

    if (sessionFields.size > 0) {
        lines.push("", "CURRENT-SESSION.md records:");
        for (const [field, value] of sessionFields) lines.push(`- ${field}: ${value}`);
    } else {
        lines.push("", "CURRENT-SESSION.md is missing or records none of the expected fields.");
    }
    return lines.join("\n");
}

function readSessionFields(sessionPath) {
    const fields = new Map();
    if (!existsSync(sessionPath)) return fields;
    let current = null;
    for (const line of readFileSync(sessionPath, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
        if (match) {
            current = SESSION_FIELDS.includes(match[1]) && !fields.has(match[1]) ? match[1] : null;
            if (current) fields.set(current, match[2].trim());
        } else if (current && /^\S/.test(line) && !/^[-#|>]/.test(line)) {
            // A wrapped field value continues on the next unindented prose line.
            fields.set(current, `${fields.get(current)} ${line.trim()}`);
        } else {
            current = null;
        }
    }
    return fields;
}

function liveState(root, sessionFields) {
    const branch = git(root, ["branch", "--show-current"]) || "(detached HEAD)";
    const upstream = git(root, ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"]);
    const [behind, ahead] = upstream ? upstream.split(/\s+/) : [];
    const head = git(root, ["log", "-1", "--format=%h %s"]) ?? "(no commits)";
    const changes = (git(root, ["status", "--porcelain"]) ?? "").split("\n").filter(Boolean);

    const state = [
        `- Checkout: ${root}`,
        `- Branch: ${branch}${upstream ? ` (ahead ${ahead}, behind ${behind} of upstream)` : " (no upstream)"}`,
        `- HEAD: ${head}`,
        `- Uncommitted changes: ${changes.length}`,
        ...changes.slice(0, MAX_LISTED_CHANGES).map((line) => `    ${line}`),
    ];
    if (changes.length > MAX_LISTED_CHANGES) state.push(`    ... and ${changes.length - MAX_LISTED_CHANGES} more`);

    const recordedBranch = sessionFields.get("Branch")?.replace(/`/g, "");
    if (recordedBranch && recordedBranch !== branch) {
        state.push(
            `- MISMATCH: CURRENT-SESSION.md records branch ${recordedBranch}, but the checkout is on ${branch}.`
                + " Follow session-init.md section 5: stop, report it, and ask the Owner.",
        );
    }
    return state;
}

function git(cwd, args) {
    try {
        return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
        return null;
    }
}
