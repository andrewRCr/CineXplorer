// Install the reviewed hook and skill locally without changing the primary checkout's branch.
import { execFileSync } from "node:child_process";
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: source, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
}).trim();
const primary = dirname(common);
const local = join(primary, ".codex");
const hookDirectory = join(local, "hooks", "legacy-arc");
const hooksPath = join(local, "hooks.json");
const config = existsSync(hooksPath) ? JSON.parse(readFileSync(hooksPath, "utf8")) : {};
config.hooks ??= {};
const commands = [
    ["PreCompact", "manual|auto", "codex-arm"],
    ["PostToolUse", null, "codex-claim post-tool-use"],
    ["SessionStart", "clear", "codex-clear"],
    ["UserPromptSubmit", null, "codex-claim user-prompt-submit"],
];
for (const [event, matcher, args] of commands) {
    const command = 'hook="$(git rev-parse --show-toplevel 2>/dev/null)/.codex/hooks/legacy-arc/compaction-recovery.mjs"; '
        + `node "$hook" ${args}`;
    const entries = config.hooks[event] ??= [];
    const existing = entries.flatMap((entry) => entry.hooks ?? [])
        .filter((hook) => hook.type === "command" && hook.command?.includes("compaction-recovery.mjs"));
    if (existing.length > 0) {
        for (const hook of existing) hook.command = command;
    } else {
        entries.push({ ...(matcher === null ? {} : { matcher }), hooks: [{ type: "command", command, timeout: 30 }] });
    }
}
mkdirSync(hookDirectory, { recursive: true });
for (const file of ["compaction-recovery.mjs", "errand-session.mjs"]) {
    copyFileSync(join(source, ".arc/reference/harness-hooks", file), join(hookDirectory, file));
}
const skillDirectory = join(local, "skills", "errand");
mkdirSync(skillDirectory, { recursive: true });
copyFileSync(join(source, ".arc/reference/agent/skills/errand/SKILL.md"), join(skillDirectory, "SKILL.md"));
if (existsSync(hooksPath)) {
    try {
        copyFileSync(hooksPath, `${hooksPath}.before-isolated-errands`, constants.COPYFILE_EXCL);
    } catch (error) {
        if (error.code !== "EEXIST") throw error;
    }
}
const temporary = `${hooksPath}.${process.pid}.tmp`;
try {
    writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
    renameSync(temporary, hooksPath);
} finally {
    rmSync(temporary, { force: true });
}
console.log(`Installed recovery hooks and the errand skill in ${local}.`);
console.log("Approve changed project hooks if the harness requests trust. Keep the source checkout until checks pass.");
