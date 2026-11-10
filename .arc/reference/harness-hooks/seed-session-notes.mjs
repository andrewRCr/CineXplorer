import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

function git(...args) {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function seed() {
    const root = git("rev-parse", "--show-toplevel");
    const main = dirname(git("rev-parse", "--path-format=absolute", "--git-common-dir"));
    if (root === main) throw new Error("Run from a linked worktree, not the main checkout.");

    let folders = [];
    try {
        folders = readdirSync(join(main, ".arc/user"), { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
    if (folders.length === 0) throw new Error("No folder under .arc/user/ in the main checkout.");
    if (folders.length !== 1) {
        throw new Error(`Several folders under .arc/user/ in the main checkout (${folders.join(", ")}).`);
    }
    const branch = git("branch", "--show-current");
    if (!branch) throw new Error("Cannot seed notes on a detached HEAD.");
    const match = /^[a-z]+\/([a-z0-9][a-z0-9-]*)$/.exec(branch);
    if (!match) throw new Error("The branch must have the form {type}/{name} using lowercase letters, digits and hyphens.");
    const name = match[1];
    const path = join(root, ".arc/user", folders[0], name, "SESSION-NOTES.md");
    if (existsSync(path)) throw new Error(`Session notes already exists: ${path}`);
    const notes = [
        `# Session Notes: ${name}`, "",
        "**State:** planning",
        `**Branch:** \`${branch}\``,
        "**Task List:** [none yet]",
        "**Next Task:** [none yet]",
        "**Last Completed:** [none]",
        "**Blockers:** [none]",
        "**Next Action:** draft the design (`1a_draft-design.md`)",
        "**Commit at Handoff:** [none yet]", "",
        "## Uncommitted Work", "", "[none]", "",
        "## Remaining Work Before Returning to Task List", "", "[none]", "",
        "## Additional Context", "", "[none]", "",
    ].join("\n");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, notes, { flag: "wx" });
    console.log(path);
}

try {
    seed();
} catch (error) {
    console.error(error.stderr?.toString().trim() || error.message);
    process.exitCode = 1;
}
