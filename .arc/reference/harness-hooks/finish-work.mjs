// The process steps of closing a merged worktree, run by `node scripts/worktree.mjs finish {name}` from the main
// checkout (archive-completed.md Phase 3, run-errand.md § 6):
//   before-remove {name}  hold while the task list has an unchecked box; keep the worktree's personal folder
//   after-remove {name}   archive the planned work, with its kept review log, and commit; refresh the errand harness
// Both phases can be run again: a kept folder that matches is skipped, and the hold is checked in each.
import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmdirSync }
    from "node:fs";
import { dirname, join } from "node:path";

const CATEGORIES = ["feature", "technical", "incidental"];
const ARCHIVED = [["draft", "the design draft"], ["prd", "the PRD"], ["tasks", "the finished task list"],
    ["notes", "its notes"], ["completion", "its completion summary"]];
// The files install-errand-harness.mjs copies into the main checkout's .codex/, as [installed, source].
const HARNESS = [
    [".codex/hooks/legacy-arc/compaction-recovery.mjs", ".arc/reference/harness-hooks/compaction-recovery.mjs"],
    [".codex/hooks/legacy-arc/errand-session.mjs", ".arc/reference/harness-hooks/errand-session.mjs"],
    [".codex/skills/errand/SKILL.md", ".arc/reference/agent/skills/errand/SKILL.md"],
];

function git(cwd, args, input) {
    return execFileSync("git", args, {
        cwd, encoding: "utf8", input, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    }).trim();
}

// Git's hooks report a refused commit on stdout, so a failed command shows both of its streams.
function output(error) {
    const streams = [error.stdout, error.stderr].map((stream) => stream?.toString().trim()).filter(Boolean).join("\n");
    return streams || error.message;
}

function context() {
    const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]);
    const main = dirname(git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]));
    if (root !== main) throw new Error("Run from the main checkout.");
    return main;
}

function identity(main) {
    let folders = [];
    try {
        folders = readdirSync(join(main, ".arc/user"), { withFileTypes: true })
            .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
    if (folders.length !== 1) {
        throw new Error(folders.length ? `Several folders under .arc/user/ in the main checkout (${folders.join(", ")}).`
            : "No folder under .arc/user/ in the main checkout.");
    }
    return folders[0];
}

function today() {
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, "0")).join("-");
}

function taskList(main, name) {
    const found = CATEGORIES.filter((category) => existsSync(join(main, ".arc/active", category, `tasks-${name}.md`)));
    if (found.length > 1) throw new Error(`tasks-${name}.md is active in several categories: ${found.join(", ")}.`);
    return found.length ? { category: found[0], path: join(main, ".arc/active", found[0], `tasks-${name}.md`) } : null;
}

// Plain unchecked boxes only: `[x]` is done, `[~]` deliberately not done, and `~~[ ]~~` superseded.
function holdForUncheckedBoxes(list, name) {
    if (!list) return;
    let heading = "";
    const open = [];
    for (const line of readFileSync(list.path, "utf8").split("\n")) {
        if (/^#{2,4} /.test(line)) heading = line.replace(/^#+ /, "");
        else if (/^\s*[-*] \[ \]/.test(line)) {
            const item = line.trim().replace(/^[-*] \[ \] /, "");
            open.push(`${heading ? `${heading}: ` : ""}${item.length > 90 ? `${item.slice(0, 89)}…` : item}`);
        }
    }
    if (!open.length) return;
    throw new Error([
        `tasks-${name}.md has ${open.length} unchecked item(s):`, ...open.map((item) => `  - ${item}`),
        "Criteria proven only after the merge are proven now: record each one's evidence in the task list, check it,",
        "and push that .arc/-only commit with the Owner's approval (archive-completed.md § 9). Then run finish again.",
    ].join("\n"));
}

function sameTree(left, right) {
    const a = lstatSync(left, { throwIfNoEntry: false });
    const b = lstatSync(right, { throwIfNoEntry: false });
    if (!a || !b) return false;
    if (a.isSymbolicLink() || b.isSymbolicLink()) {
        return a.isSymbolicLink() && b.isSymbolicLink() && readlinkSync(left) === readlinkSync(right);
    }
    if (a.isDirectory() !== b.isDirectory()) return false;
    if (!a.isDirectory()) return readFileSync(left).equals(readFileSync(right));
    const names = readdirSync(left).sort();
    const others = readdirSync(right).sort();
    return names.length === others.length && names.every((entry, index) => entry === others[index]
        && sameTree(join(left, entry), join(right, entry)));
}

function keepPersonalFolder(main, name) {
    const id = identity(main);
    const source = join(`${main}.${name}`, ".arc/user", id, name);
    if (!existsSync(source)) return console.log(`No personal folder in the worktree to keep (.arc/user/${id}/${name}/).`);
    const kept = `errand-records/${name}-${today()}`;
    const target = join(main, ".arc/user", id, kept);
    const shown = `.arc/user/${id}/${kept}/`;
    if (existsSync(target)) {
        if (sameTree(source, target)) return console.log(`Personal folder already kept in ${shown}`);
        throw new Error(`${shown} already exists and differs from the worktree's .arc/user/${id}/${name}/; ` +
            "compare and resolve them, then run finish again.");
    }
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true,
        verbatimSymlinks: true });
    console.log(`Kept the worktree's personal folder in ${shown}`);
}

// The newest review log kept for this name: REVIEW-LOG.md in the latest errand-records/{name}-{date}/ folder that has one.
function keptReviewLog(main, name) {
    const records = join(main, ".arc/user", identity(main), "errand-records");
    if (!existsSync(records)) return null;
    const pattern = new RegExp(`^${name}-\\d{4}-\\d{2}-\\d{2}$`);
    const latest = readdirSync(records).filter((entry) => pattern.test(entry)).sort().reverse()
        .find((entry) => existsSync(join(records, entry, "REVIEW-LOG.md")));
    return latest ? join(records, latest, "REVIEW-LOG.md") : null;
}

function quarterOf(date) {
    return `${date.getFullYear()}-q${Math.floor(date.getMonth() / 3) + 1}`;
}

function nextFolder(main, quarter, name) {
    const root = join(main, ".arc/reference/archive", quarter);
    let highest = 0;
    for (const category of existsSync(root) ? readdirSync(root, { withFileTypes: true }) : []) {
        if (!category.isDirectory()) continue;
        for (const unit of readdirSync(join(root, category.name), { withFileTypes: true })) {
            const match = /^(\d+)_(.+)$/.exec(unit.name);
            if (!unit.isDirectory() || !match) continue;
            if (match[2] === name) throw new Error(`${name} is already archived in ${quarter}/${category.name}/${unit.name}/.`);
            highest = Math.max(highest, Number(match[1]));
        }
    }
    return String(highest + 1).padStart(2, "0");
}

function listed(items) {
    return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0];
}

function archive(main, name, list) {
    if (!list) return console.log(`No active task list for ${name}; nothing to archive.`);
    if (git(main, ["branch", "--show-current"]) !== "main") throw new Error("The main checkout must be on main to archive.");
    if (git(main, ["status", "--porcelain", "--untracked-files=no"])) {
        throw new Error("The main checkout has changes to tracked files; commit or set them aside before archiving.");
    }
    const quarter = quarterOf(new Date());
    const folder = `.arc/reference/archive/${quarter}/${list.category}/${nextFolder(main, quarter, name)}_${name}`;
    const moved = ARCHIVED.filter(([prefix]) => existsSync(join(main, ".arc/active", list.category, `${prefix}-${name}.md`)))
        .map(([prefix, description]) => ({ from: `.arc/active/${list.category}/${prefix}-${name}.md`, description,
            to: `${folder}/${prefix}-${name}.md` }));
    const log = keptReviewLog(main, name);
    const logTo = `${folder}/review-log-${name}.md`;
    mkdirSync(join(main, folder), { recursive: true });
    for (const { from, to } of moved) git(main, ["mv", from, to]);
    if (log) {
        copyFileSync(log, join(main, logTo));
        git(main, ["add", logTo]);
    }
    const subject = `docs(arc): archive the ${name.replaceAll("-", " ")} work`;
    const message = [
        subject.length <= 72 ? subject : `docs(arc): archive ${name}`, "",
        `Move ${listed(moved.map(({ description }) => description))} into the archive${log ? ", and add its review log" : ""}.`, "",
        `Context: tasks-${name}.md (maintenance)`, "",
    ].join("\n");
    try {
        git(main, ["commit", "--quiet", "-F", "-"], message);
    } catch (error) {
        // Drop the copied log and put the documents back, so a rerun finds the active task list and starts over.
        if (log) git(main, ["rm", "--quiet", "--force", logTo]);
        mkdirSync(join(main, ".arc/active", list.category), { recursive: true });
        for (const { from, to } of moved) git(main, ["mv", to, from]);
        rmdirSync(join(main, folder));
        throw new Error(`${output(error)}\nThe archive commit failed, so its moves were undone; resolve it, then run ` +
            `node .arc/reference/harness-hooks/finish-work.mjs after-remove ${name} again.`);
    }
    console.log(`Archived in ${folder}/ as ${git(main, ["rev-parse", "--short", "HEAD"])}.`);
    console.log("Push it to main on the Owner's approval: git push origin main");
}

function refreshHarness(main) {
    if (!existsSync(join(main, ".codex/hooks/legacy-arc"))) return;
    const stale = HARNESS.filter(([installed, source]) => !existsSync(join(main, installed))
        || !readFileSync(join(main, installed)).equals(readFileSync(join(main, source))));
    if (!stale.length) return console.log("The installed errand harness matches main.");
    const output = execFileSync(process.execPath, [".arc/reference/harness-hooks/install-errand-harness.mjs"], {
        cwd: main, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    console.log(`Refreshed the errand harness (${stale.map(([installed]) => installed).join(", ")} differed).\n${output}`);
}

function roadmapNote(main, name) {
    const roadmap = join(main, ".arc/backlog/ROADMAP.md");
    if (existsSync(roadmap) && readFileSync(roadmap, "utf8").includes(name)) {
        console.log(`ROADMAP.md mentions ${name}: update it if it tracks this work (archive-completed.md § 11).`);
    }
}

function main() {
    const [phase, name, ...rest] = process.argv.slice(2);
    if (!["before-remove", "after-remove"].includes(phase) || rest.length || !/^[a-z0-9][a-z0-9-]*$/.test(name ?? "")) {
        throw new Error("Usage: node .arc/reference/harness-hooks/finish-work.mjs before-remove|after-remove {name}");
    }
    const root = context();
    const list = taskList(root, name);
    holdForUncheckedBoxes(list, name);
    if (phase === "before-remove") return keepPersonalFolder(root, name);
    archive(root, name, list);
    roadmapNote(root, name);
    refreshHarness(root);
}

try {
    main();
} catch (error) {
    console.error(output(error));
    process.exitCode = 1;
}
