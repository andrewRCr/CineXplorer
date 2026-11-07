// Check the ADR records a change brings against the commit it starts from. CI's Docs job runs it on every pull request
// and on each push to `main`; run it from a terminal before a direct push (archive-completed.md § 8 and § 12):
//   node .arc/reference/scripts/check-adr-records.mjs <base>
// It compares HEAD with its merge base with <base>, so every commit since then counts, and refuses:
//   - a new ADR with no Status section, or one whose status counts as Proposed;
//   - an existing ADR that loses its Status section, or returns to Proposed from another status;
//   - two ADRs that share a number.
// A status counts as Proposed unless its first word is Accepted, Deprecated or Superseded, so a legacy Draft does
// (strategy-adr-methodology.md § Status). An ADR that already counts as Proposed stays editable. Records are
// `.arc/reference/adr/adr-NNN-*.md`; the template and README beside them are not.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RECORD = /^\.arc\/reference\/adr\/adr-(\d+)(?:-[^/]*)?\.md$/;
const SETTLED = new Set(["accepted", "deprecated", "superseded"]);
const USAGE = "Usage: node .arc/reference/scripts/check-adr-records.mjs <base>, where <base> is the branch or commit "
    + "the change starts from, such as origin/main.";

function git(args) {
    return execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

function revision(args) {
    try {
        return git(args).trim();
    } catch {
        return undefined;
    }
}

// The lines of the first `## Status` section outside fenced code, up to the next heading of level 1 or 2.
function statusSection(lines) {
    let fence;
    let start;
    for (const [index, line] of lines.entries()) {
        const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
        if (fence !== undefined) {
            const closes = delimiter !== null && delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length
                && delimiter[2].trim() === "";
            if (closes) fence = undefined;
            continue;
        }
        if (delimiter !== null) {
            fence = delimiter[1];
            continue;
        }
        const heading = /^ {0,3}(#{1,6})(?:[\t ]+(.*)|[\t ]*)$/.exec(line);
        if (heading === null || heading[1].length > 2) continue;
        if (start !== undefined) return lines.slice(start, index);
        const text = (heading[2] ?? "").replace(/[\t ]+#+[\t ]*$/, "").trim();
        if (heading[1].length === 2 && text === "Status") start = index + 1;
    }
    return start === undefined ? [] : lines.slice(start);
}

/** An ADR's Status section, its first line and whether that status counts as Proposed; null when it has none. */
export function parseStatus(content) {
    const text = statusSection(content.split(/\r?\n/)).join("\n").trim();
    const line = text.split("\n").find((candidate) => candidate.trim() !== "")?.trim();
    if (line === undefined) return null;
    const word = line.split(/\s+/)[0].replace(/^[*_]+/, "").replace(/[\p{P}\p{S}]+$/u, "").toLowerCase();
    return { line, text, proposed: !SETTLED.has(word) };
}

function records(commit) {
    const output = git(["ls-tree", "-r", "-z", "--full-tree", commit, "--", ".arc/reference/adr/"]);
    return output.split("\0").filter(Boolean).flatMap((row) => {
        const tab = row.indexOf("\t");
        const [, kind, objectId] = row.slice(0, tab).split(" ");
        const path = row.slice(tab + 1);
        const match = RECORD.exec(path);
        return kind === "blob" && match !== null ? [{ path, objectId, number: Number(match[1]) }] : [];
    });
}

// The base's version of a record: the same path, or the one same-number path a rename replaced.
function baseVersion(record, tree, base) {
    const samePath = base.find((candidate) => candidate.path === record.path);
    if (samePath !== undefined) return samePath;
    const treePaths = new Set(tree.map((candidate) => candidate.path));
    const basePaths = new Set(base.map((candidate) => candidate.path));
    const removed = base.filter((candidate) => candidate.number === record.number && !treePaths.has(candidate.path));
    const added = tree.filter((candidate) => candidate.number === record.number && !basePaths.has(candidate.path));
    return removed.length === 1 && added.length === 1 ? removed[0] : undefined;
}

function statusFailure(record, status, original, originalStatus, today, baseLabel) {
    if (original === undefined) {
        if (status === null) {
            return `${record.path} is a new ADR with no Status section. Add "## Status" reading "Accepted (${today})" `
                + "before it merges.";
        }
        if (!status.proposed) return undefined;
        return `${record.path} is a new ADR reading Proposed ("${status.line}"). A new ADR merges Accepted: set its `
            + `Status to "Accepted (${today})" before it merges.`;
    }
    if (originalStatus === null) return undefined;
    let reason;
    if (status === null) reason = "removes its Status section";
    else if (status.proposed && !originalStatus.proposed) reason = `returns an ADR to Proposed ("${status.line}")`;
    else return undefined;
    const restore = originalStatus.text.split("\n").map((line) => `  ${line}`).join("\n");
    return `${record.path} ${reason}. Restore the Status section of its base version (${original.path} at `
        + `${baseLabel}):\n${restore}`;
}

function statusFailures(tree, base, mergeBase, today) {
    const examined = tree.flatMap((record) => {
        const original = baseVersion(record, tree, base);
        const changed = original === undefined || original.path !== record.path || original.objectId !== record.objectId;
        return changed ? [{ record, original }] : [];
    });
    const failures = examined.flatMap(({ record, original }) => {
        const status = parseStatus(git(["show", `HEAD:${record.path}`]));
        const originalStatus = original === undefined ? null : parseStatus(git(["show", `${mergeBase}:${original.path}`]));
        const failure = statusFailure(record, status, original, originalStatus, today, mergeBase.slice(0, 7));
        return failure === undefined ? [] : [failure];
    });
    return { examined: examined.length, failures };
}

function adrName(number) {
    return `ADR-${String(number).padStart(3, "0")}`;
}

function renumbering(shared, basePaths, allocate) {
    const added = shared.filter((record) => !basePaths.has(record.path))
        .sort((left, right) => left.path.localeCompare(right.path));
    if (added.length === 0) {
        return "In a separate change, renumber every path but the one that landed first on the base branch to "
            + `${allocate(shared.length - 1).join(", ")}.`;
    }
    if (added.length === shared.length) {
        const targets = allocate(added.length - 1).join(", ");
        return added.length === 2 ? `Renumber either added path to ${targets}.`
            : `Renumber any ${added.length - 1} of the added paths to ${targets}, keeping one unchanged.`;
    }
    const targets = allocate(added.length);
    return added.map((record, index) => `Renumber ${record.path} to ${targets[index]}.`).join("\n");
}

function numberFailures(tree, base) {
    let next = Math.max(0, ...[...tree, ...base].map((record) => record.number)) + 1;
    const allocate = (count) => Array.from({ length: count }, () => adrName(next++));
    const basePaths = new Set(base.map((record) => record.path));
    const groups = new Map();
    for (const record of tree) groups.set(record.number, [...(groups.get(record.number) ?? []), record]);
    return [...groups].filter(([, shared]) => shared.length > 1).sort(([left], [right]) => left - right)
        .map(([number, shared]) => [
            `${adrName(number)} is shared by:`,
            ...shared.map((record) => `  ${record.path}`),
            renumbering(shared, basePaths, allocate),
            "Also update the records that cite the renumbered ADR by number.",
        ].join("\n"));
}

function localDate(date) {
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, "0")).join("-");
}

function main(args) {
    if (args.length !== 1 || args[0].startsWith("-")) throw new Error(USAGE);
    const [base] = args;
    const commit = revision(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
    if (!commit) throw new Error(`${base} doesn't name a commit here, so there is nothing to compare against.\n${USAGE}`);
    const mergeBase = revision(["merge-base", commit, "HEAD"]);
    if (!mergeBase) throw new Error(`HEAD shares no history with ${base}.\n${USAGE}`);
    const tree = records("HEAD");
    const baseRecords = records(mergeBase);
    const { examined, failures } = statusFailures(tree, baseRecords, mergeBase, localDate(new Date()));
    failures.push(...numberFailures(tree, baseRecords));
    if (failures.length > 0) throw new Error(failures.join("\n\n"));
    console.log(`ADR records: ${tree.length} numbered, ${examined} changed since ${mergeBase.slice(0, 7)} (the merge base `
        + `with ${base}); no problems.`);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        main(process.argv.slice(2));
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}
