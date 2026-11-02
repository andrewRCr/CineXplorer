// Session-scoped execution checkout for errands launched beside a paused checkout.
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { linkSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

function git(root, ...args) {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function commonDirectory(root) {
    return realpathSync(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"));
}

function checkoutRoot(path) {
    return realpathSync(git(path, "rev-parse", "--show-toplevel"));
}

function recordPath(root, sessionId) {
    const key = createHash("sha256").update(sessionId).digest("hex");
    return join(commonDirectory(root), "legacy-arc-errands", `${key}.json`);
}

function readRecord(root, sessionId) {
    if (!sessionId || sessionId === "no-session") return null;
    let record;
    try {
        record = JSON.parse(readFileSync(recordPath(root, sessionId), "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw new Error("The active errand record cannot be read; resolve it before continuing.", { cause: error });
    }
    if (record?.version !== 1 || ![record.home, record.checkout].every((path) => typeof path === "string" && isAbsolute(path))
        || typeof record.branch !== "string" || !record.branch || record.home === record.checkout) {
        throw new Error("The active errand record is invalid; resolve it before continuing.");
    }
    if (checkoutRoot(record.home) !== record.home || commonDirectory(record.home) !== commonDirectory(root)) {
        throw new Error("The active errand home does not belong to this repository.");
    }
    return record;
}

function registeredCheckouts(root) {
    return git(root, "worktree", "list", "--porcelain", "-z").split("\0")
        .filter((field) => field.startsWith("worktree ")).map((field) => field.slice(9));
}

export function activeErrand(root, sessionId) {
    const record = readRecord(root, sessionId);
    if (record === null) return null;
    if (!registeredCheckouts(root).includes(record.checkout)) {
        throw new Error(`The active errand checkout is no longer registered: ${record.checkout}. Return explicitly before cleanup.`);
    }
    try {
        if (checkoutRoot(record.checkout) !== record.checkout || commonDirectory(record.checkout) !== commonDirectory(root)) {
            throw new Error("different repository");
        }
        if (git(record.checkout, "branch", "--show-current") !== record.branch) throw new Error("branch changed");
    } catch (error) {
        throw new Error(`The active errand checkout is missing or changed: ${record.checkout}. Resolve it or return explicitly.`, { cause: error });
    }
    return record;
}

export function errandCommand(root, command, target, env = process.env) {
    const sessionId = env.CODEX_THREAD_ID || env.CODEX_SESSION_ID;
    if (!sessionId || sessionId === "no-session") throw new Error("A CODEX_THREAD_ID or CODEX_SESSION_ID is required.");
    if (env.CODEX_THREAD_ID && env.CODEX_SESSION_ID && env.CODEX_THREAD_ID !== env.CODEX_SESSION_ID) {
        throw new Error("The thread and session identifiers differ; resolve the hook session identifier before entering an errand.");
    }
    const home = checkoutRoot(root);
    const path = recordPath(root, sessionId);
    if (command === "errand-return") {
        const record = readRecord(root, sessionId);
        if (record !== null && record.home !== home) throw new Error(`Return from the session home: ${record.home}`);
        rmSync(path, { force: true });
        return { state: "home", checkoutPath: home };
    }
    const current = activeErrand(root, sessionId);
    if (command === "errand-status") {
        return current === null ? { state: "home", checkoutPath: home }
            : { state: "errand", checkoutPath: current.checkout, home: current.home, branch: current.branch };
    }
    if (command !== "errand-enter" || !target || !isAbsolute(target)) {
        throw new Error("Usage: errand-enter <absolute-checkout> | errand-status | errand-return");
    }
    const checkout = checkoutRoot(target);
    if (current !== null) {
        if (current.home === home && current.checkout === checkout) {
            return { state: "errand", checkoutPath: checkout, home, branch: current.branch };
        }
        throw new Error("This session already has an active errand; return before entering another.");
    }
    if (checkout === home || commonDirectory(checkout) !== commonDirectory(home)
        || !registeredCheckouts(home).includes(checkout)) throw new Error("Enter a different registered checkout of this repository.");
    const branch = git(checkout, "branch", "--show-current");
    if (!branch || branch === "main") throw new Error("The errand checkout must have its own branch.");
    const record = { version: 1, home, checkout, branch };
    const directory = join(commonDirectory(home), "legacy-arc-errands");
    mkdirSync(directory, { recursive: true });
    const temporary = join(directory, `${randomUUID()}.tmp`);
    try {
        writeFileSync(temporary, `${JSON.stringify(record)}\n`, { flag: "wx", mode: 0o600 });
        // Publish the complete record atomically without replacing another entry.
        linkSync(temporary, path);
    } finally {
        rmSync(temporary, { force: true });
    }
    return { state: "errand", checkoutPath: checkout, home, branch };
}
