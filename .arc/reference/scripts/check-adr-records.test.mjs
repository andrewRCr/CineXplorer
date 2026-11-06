import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { parseStatus } from "./check-adr-records.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "check-adr-records.mjs");
const GIT_ENV = {
    ...process.env,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
};
const NOW = new Date();
const TODAY = [NOW.getFullYear(), NOW.getMonth() + 1, NOW.getDate()].map((part) => String(part).padStart(2, "0")).join("-");
const DIR = ".arc/reference/adr";
const ACCEPTED = "Accepted (2026-10-10)\n\nRealized with the browse rebuild.";
const DRAFT = "Draft (Implementation in progress)";
const TEMPLATE_STATUS = "Proposed\n\n<!-- Valid states:\n- Proposed: while the delivering change is unmerged.\n-->";

function adr(status, body = "The decision.") {
    return `# ADR: Sample\n\n## Status\n\n${status}\n\n## Context\n\n${body}\n`;
}

const NO_STATUS = "# ADR: Sample\n\n## Context\n\nThe decision.\n";

function git(cwd, ...args) {
    return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

// A repository whose first commit, `base`, holds an accepted ADR, a legacy draft, the template and the README.
function fixture(t) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "cx-adr-records-")));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    git(root, "init", "-q", "-b", "main");
    const repo = {
        root,
        write(name, contents) {
            const path = join(root, name.includes("/") ? name : `${DIR}/${name}`);
            mkdirSync(dirname(path), { recursive: true });
            writeFileSync(path, contents);
            return repo;
        },
        remove(name) {
            git(root, "rm", "-q", `${DIR}/${name}`);
            return repo;
        },
        commit(message = "change") {
            git(root, "add", "-A");
            git(root, "commit", "-q", "--allow-empty", "-m", message);
            return git(root, "rev-parse", "HEAD");
        },
        run: (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, env: GIT_ENV, encoding: "utf8" }),
    };
    repo.write("adr-001-accepted.md", adr(ACCEPTED))
        .write("adr-010-draft.md", adr(DRAFT))
        .write("adr-template.md", adr(TEMPLATE_STATUS))
        .write("README.md", "# Architecture Decision Records\n")
        .write("app.txt", "app\n");
    repo.base = repo.commit("base");
    return repo;
}

function passes(result) {
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /ADR records/);
}

function refuses(result, ...reasons) {
    assert.equal(result.status, 1, result.stdout + result.stderr);
    for (const reason of reasons) assert.match(result.stderr, reason);
}

const path = (name) => `${DIR}/${name}`.replaceAll(".", "\\.");

test("reads the first nonblank line of the first real Status section", () => {
    const content = "```md\n## Status\n\nAccepted\n```\n\n## Status\n\n\nProposed\n\nLater note.\n### Detail\nKept.\n## Context\nBody";
    assert.deepEqual(parseStatus(content), {
        line: "Proposed", text: "Proposed\n\nLater note.\n### Detail\nKept.", proposed: true,
    });
    for (const missing of ["# Record\n\nNo status.", "## Status\n\n## Context\nBody", "## status\nAccepted"]) {
        assert.equal(parseStatus(missing), null, missing);
    }
});

test("counts any status outside accepted, deprecated and superseded as Proposed", () => {
    for (const line of ["Proposed", "**Proposed**", "_proposed_.", DRAFT, "Rejected"]) {
        assert.equal(parseStatus(adr(line)).proposed, true, line);
    }
    for (const line of [
        "Accepted", "Accepted (2026-11-06)", "Accepted (Owner, 2025-10-22)", "**Accepted**",
        "Accepted; Superseded in part by ADR-021 (inbox, weekly review and new atomic tasks)",
        "Accepted (Partially superseded by ADR-016)", "Deprecated - no longer valid", "Superseded by ADR-029.",
    ]) {
        assert.equal(parseStatus(adr(line)).proposed, false, line);
    }
});

test("refuses a new ADR reading Proposed, or Draft, with a dated acceptance remedy", (t) => {
    for (const status of ["Proposed", DRAFT]) {
        const repo = fixture(t);
        repo.write("adr-011-new.md", adr(status)).commit();
        refuses(repo.run(repo.base), new RegExp(`${path("adr-011-new.md")} is a new ADR reading Proposed`),
            new RegExp(`Accepted \\(${TODAY}\\)`));
    }
});

test("refuses a new ADR with no Status section", (t) => {
    const repo = fixture(t);
    repo.write("adr-011-new.md", NO_STATUS).commit();
    refuses(repo.run(repo.base), new RegExp(`${path("adr-011-new.md")} is a new ADR with no Status section`));
});

test("refuses returning an ADR to Proposed or Draft, giving the base Status to restore", (t) => {
    for (const status of ["Proposed", DRAFT]) {
        const repo = fixture(t);
        repo.write("adr-001-accepted.md", adr(status)).commit();
        refuses(repo.run(repo.base), new RegExp(`${path("adr-001-accepted.md")} returns an ADR to Proposed`),
            /Accepted \(2026-10-10\)\n\s*\n\s*Realized with the browse rebuild\./);
    }
});

test("refuses removing an ADR's Status section", (t) => {
    const repo = fixture(t);
    repo.write("adr-001-accepted.md", NO_STATUS).commit();
    refuses(repo.run(repo.base), new RegExp(`${path("adr-001-accepted.md")} removes its Status section`));
});

test("refuses two ADRs sharing a number, naming the one the change adds", (t) => {
    const repo = fixture(t);
    repo.write("adr-001-another.md", adr("Accepted (2026-11-06)")).commit();
    refuses(repo.run(repo.base), /ADR-001 is shared by/, new RegExp(path("adr-001-accepted.md")),
        new RegExp(`Renumber ${path("adr-001-another.md")} to ADR-011`));
});

test("reports every failure in one run", (t) => {
    const repo = fixture(t);
    repo.write("adr-011-one.md", adr("Proposed")).write("adr-012-two.md", NO_STATUS).commit();
    refuses(repo.run(repo.base), new RegExp(path("adr-011-one.md")), new RegExp(path("adr-012-two.md")));
});

test("passes a new ADR accepted from the template, and edits that keep a status", (t) => {
    const repo = fixture(t);
    repo.write("adr-011-new.md", adr(TEMPLATE_STATUS.replace("Proposed", `Accepted (${TODAY})`)))
        .write("adr-001-accepted.md", adr(ACCEPTED, "The decision, with a corrected link."))
        .commit();
    passes(repo.run(repo.base));
});

test("leaves an untouched legacy draft alone, and keeps a draft editable", (t) => {
    const repo = fixture(t);
    repo.write("app.txt", "app, changed\n").write("adr-template.md", adr(TEMPLATE_STATUS, "Guidance."))
        .write("README.md", "# ADRs\n").commit();
    passes(repo.run(repo.base));
    repo.write("adr-010-draft.md", adr(DRAFT, "Edited while still a draft.")).commit();
    passes(repo.run(repo.base));
    repo.write("adr-010-draft.md", adr("Accepted (2025-11-09)")).commit();
    passes(repo.run(repo.base));
});

test("ignores the template, the README and other unnumbered files", (t) => {
    const repo = fixture(t);
    repo.write("adr-template.md", adr("Proposed", "New guidance.")).write("adr-guide.md", adr("Proposed"))
        .write("README.md", "# ADRs\n\n- ADR-001\n").commit();
    const result = repo.run(repo.base);
    passes(result);
    assert.match(result.stdout, /2 numbered, 0 changed/);
});

test("treats a rename that keeps the number as the same record", (t) => {
    const repo = fixture(t);
    repo.remove("adr-010-draft.md").write("adr-010-renamed.md", adr(DRAFT)).commit();
    passes(repo.run(repo.base));
});

test("checks every commit since the base, not only the last", (t) => {
    const repo = fixture(t);
    repo.write("adr-011-new.md", adr("Proposed")).commit("add a proposed ADR");
    const tip = repo.write("app.txt", "unrelated\n").commit("unrelated");
    refuses(repo.run(repo.base), new RegExp(`${path("adr-011-new.md")} is a new ADR reading Proposed`));
    passes(repo.run(`${tip}~1`));

    const accepted = fixture(t);
    accepted.write("adr-011-new.md", adr("Proposed")).commit("propose");
    accepted.write("adr-011-new.md", adr(`Accepted (${TODAY})`)).commit("accept");
    passes(accepted.run(accepted.base));
});

test("compares against the merge base, so a branch isn't blamed for later changes on the base branch", (t) => {
    const repo = fixture(t);
    git(repo.root, "switch", "-q", "-c", "feature");
    repo.write("app.txt", "feature work\n").commit();
    git(repo.root, "switch", "-q", "main");
    repo.write("adr-010-draft.md", adr("Accepted (2026-11-06)")).commit("accept the draft");
    git(repo.root, "switch", "-q", "feature");
    passes(repo.run("main"));
});

test("refuses without a usable base, naming how to run it", (t) => {
    const repo = fixture(t);
    refuses(repo.run(), /Usage: node .*check-adr-records\.mjs <base>/);
    refuses(repo.run("no-such-branch"), /no-such-branch/, /Usage: node .*check-adr-records\.mjs <base>/);
    refuses(repo.run("0000000000000000000000000000000000000000"), /Usage: node .*check-adr-records\.mjs <base>/);
});
