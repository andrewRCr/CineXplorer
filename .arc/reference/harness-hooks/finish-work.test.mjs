import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "finish-work.mjs");
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
const QUARTER = `${NOW.getFullYear()}-q${Math.floor(NOW.getMonth() / 3) + 1}`;
const DONE = "# Tasks: sample\n\n## Tasks\n\n- [x] 1.1 Build it\n- [~] 1.2 Deferred, with its reason\n" +
    "- ~~[ ] **1.3 Superseded**~~ *(replaced)*\n\n## Success Criteria\n\n### Implemented\n\n- [x] 1. It works\n";
const HARNESS = [
    [".codex/hooks/legacy-arc/compaction-recovery.mjs", ".arc/reference/harness-hooks/compaction-recovery.mjs"],
    [".codex/hooks/legacy-arc/errand-session.mjs", ".arc/reference/harness-hooks/errand-session.mjs"],
    [".codex/skills/errand/SKILL.md", ".arc/reference/agent/skills/errand/SKILL.md"],
];

function git(cwd, ...args) {
    return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function write(root, path, contents) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), contents);
}

function fixture(t, { category = "technical", documents = ["prd", "tasks", "completion"], tasks = DONE } = {}) {
    const parent = realpathSync(mkdtempSync(join(tmpdir(), "cx-finish-work-")));
    t.after(() => rmSync(parent, { recursive: true, force: true }));
    const main = join(parent, "main");
    const worktree = join(parent, "main.sample");
    mkdirSync(main);
    git(main, "init", "-q", "-b", "main");
    write(main, ".gitignore", ".arc/user/*/\n.codex\n");
    write(main, ".arc/user/README.md", "# Workspace\n");
    write(main, ".arc/reference/archive/README.md", "# Archive\n");
    write(main, ".arc/reference/harness-hooks/install-errand-harness.mjs", `
import { appendFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(join(parent, "installer.log"))}, process.cwd() + '\\n');
console.log('stand-in installer ran');
`);
    for (const [, source] of HARNESS) write(main, source, `source of ${source}\n`);
    for (const document of documents) {
        write(main, `.arc/active/${category}/${document}-sample.md`, document === "tasks" ? tasks : `# ${document}\n`);
    }
    git(main, "add", ".");
    git(main, "commit", "-q", "-m", "initial");
    mkdirSync(join(main, ".arc/user/andrew"));
    write(worktree, ".arc/user/andrew/sample/REVIEW-LOG.md", "review log\n");
    write(worktree, ".arc/user/andrew/sample/proofs/run.txt", Buffer.from("run output\r\n\0"));
    return {
        main, worktree, parent,
        run: (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: main, env: GIT_ENV, encoding: "utf8" }),
        installs: () => existsSync(join(parent, "installer.log")) ? readFileSync(join(parent, "installer.log"), "utf8") : "",
    };
}

function success(result) {
    assert.equal(result.status, 0, result.stdout + result.stderr);
}

function refusal(result, reason) {
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, reason);
}

function kept(main) {
    return join(main, ".arc/user/andrew/errand-records", `sample-${TODAY}`);
}

function tracked(main) {
    return git(main, "ls-files", ".arc/active", ".arc/reference/archive").split("\n").sort();
}

test("refuses a linked checkout and malformed arguments", (t) => {
    const f = fixture(t);
    const linked = join(f.parent, "linked");
    git(f.main, "worktree", "add", "-q", "-b", "fix/linked", linked);
    const result = spawnSync(process.execPath, [SCRIPT, "before-remove", "sample"], { cwd: linked, env: GIT_ENV, encoding: "utf8" });
    refusal(result, /main checkout/i);
    for (const args of [[], ["archive", "sample"], ["before-remove"], ["after-remove", "Sample"], ["after-remove", "sample", "x"]]) {
        refusal(f.run(...args), /usage/i);
    }
    assert.equal(existsSync(join(f.main, ".arc/user/andrew/errand-records")), false);
});

for (const phase of ["before-remove", "after-remove"]) {
    test(`${phase} holds while the task list has an unchecked box, naming it under its heading`, (t) => {
        const tasks = `${DONE}\n### Proven after merge\n\n- [ ] 1. The push of the merge commit deploys\n`;
        const f = fixture(t, { tasks });
        const before = tracked(f.main);
        const result = f.run(phase, "sample");
        refusal(result, /1 unchecked item/);
        assert.match(result.stderr, /Proven after merge: 1\. The push of the merge commit deploys/);
        assert.match(result.stderr, /finish again/);
        assert.doesNotMatch(result.stderr, /Build it|Deferred|Superseded/);
        assert.equal(existsSync(kept(f.main)), false);
        assert.deepEqual(tracked(f.main), before);
        assert.equal(git(f.main, "rev-list", "--count", "HEAD"), "1");
    });
}

test("before-remove keeps the worktree's personal folder byte for byte, once", (t) => {
    const f = fixture(t);
    const first = f.run("before-remove", "sample");
    success(first);
    assert.match(first.stdout, new RegExp(`errand-records/sample-${TODAY}/`));
    assert.equal(readFileSync(join(kept(f.main), "REVIEW-LOG.md"), "utf8"), "review log\n");
    assert.deepEqual(readFileSync(join(kept(f.main), "proofs/run.txt")), Buffer.from("run output\r\n\0"));
    const again = f.run("before-remove", "sample");
    success(again);
    assert.match(again.stdout, /already kept/i);
    assert.deepEqual(readdirSync(join(f.main, ".arc/user/andrew/errand-records")), [`sample-${TODAY}`]);
});

test("before-remove refuses a kept copy that differs and leaves it unchanged", (t) => {
    const f = fixture(t);
    write(kept(f.main), "REVIEW-LOG.md", "an earlier copy\n");
    refusal(f.run("before-remove", "sample"), /already exists and differs/);
    assert.equal(readFileSync(join(kept(f.main), "REVIEW-LOG.md"), "utf8"), "an earlier copy\n");
    assert.equal(existsSync(join(kept(f.main), "proofs")), false);
});

test("before-remove passes an errand with no task list and no personal folder", (t) => {
    const f = fixture(t, { documents: [] });
    rmSync(join(f.worktree, ".arc"), { recursive: true });
    const result = f.run("before-remove", "sample");
    success(result);
    assert.match(result.stdout, /no personal folder/i);
    assert.equal(existsSync(join(f.main, ".arc/user/andrew/errand-records")), false);
});

test("after-remove moves the documents into the next numbered folder and commits them", (t) => {
    const f = fixture(t);
    write(f.main, `.arc/reference/archive/${QUARTER}/technical/03_older/tasks-older.md`, "older\n");
    write(f.main, `.arc/reference/archive/${QUARTER}/incidental/06_other/tasks-other.md`, "other\n");
    git(f.main, "add", ".");
    git(f.main, "commit", "-q", "-m", "earlier archives");
    const result = f.run("after-remove", "sample");
    success(result);
    const folder = `.arc/reference/archive/${QUARTER}/technical/07_sample`;
    assert.match(result.stdout, new RegExp(`Archived in ${folder}/`));
    assert.match(result.stdout, /git push origin main/);
    assert.deepEqual(readdirSync(join(f.main, folder)).sort(), ["completion-sample.md", "prd-sample.md", "tasks-sample.md"]);
    assert.equal(git(f.main, "ls-files", ".arc/active"), "");
    assert.equal(git(f.main, "status", "--porcelain"), "");
    assert.equal(git(f.main, "log", "-1", "--format=%B"), [
        "docs(arc): archive the sample work", "",
        "Move the PRD, the finished task list and its completion summary into the archive.", "",
        "Context: tasks-sample.md (maintenance)",
    ].join("\n"));
    assert.equal(git(f.main, "show", "--name-status", "--format=", "-M", "HEAD").split("\n").filter((line) => line.startsWith("R100")).length, 3);
});

test("after-remove starts a quarter at 01 and moves only the documents present", (t) => {
    const f = fixture(t, { category: "incidental", documents: ["tasks", "notes", "completion"] });
    success(f.run("after-remove", "sample"));
    const folder = join(f.main, ".arc/reference/archive", QUARTER, "incidental/01_sample");
    assert.deepEqual(readdirSync(folder).sort(), ["completion-sample.md", "notes-sample.md", "tasks-sample.md"]);
    assert.match(git(f.main, "log", "-1", "--format=%B"), /Move the finished task list, its notes and its completion summary/);
});

test("after-remove refuses a name already archived this quarter without moving anything", (t) => {
    const f = fixture(t);
    write(f.main, `.arc/reference/archive/${QUARTER}/technical/02_sample/tasks-sample.md`, "archived\n");
    git(f.main, "add", ".");
    git(f.main, "commit", "-q", "-m", "already archived");
    const before = tracked(f.main);
    refusal(f.run("after-remove", "sample"), /already archived/);
    assert.deepEqual(tracked(f.main), before);
    assert.equal(git(f.main, "status", "--porcelain"), "");
});

test("after-remove has nothing to archive for an errand", (t) => {
    const f = fixture(t, { documents: [] });
    const result = f.run("after-remove", "sample");
    success(result);
    assert.match(result.stdout, /nothing to archive/i);
    assert.equal(git(f.main, "rev-list", "--count", "HEAD"), "1");
});

test("after-remove refreshes the errand harness only when an installed copy differs", (t) => {
    const f = fixture(t, { documents: [] });
    success(f.run("after-remove", "sample"));
    assert.equal(f.installs(), "", "a harness that was never installed stays uninstalled");
    for (const [installed, source] of HARNESS) write(f.main, installed, readFileSync(join(f.main, source)));
    const current = f.run("after-remove", "sample");
    success(current);
    assert.match(current.stdout, /matches main/);
    assert.equal(f.installs(), "");
    write(f.main, HARNESS[2][0], "an older skill\n");
    const stale = f.run("after-remove", "sample");
    success(stale);
    assert.match(stale.stdout, /Refreshed the errand harness \(\.codex\/skills\/errand\/SKILL\.md differed\)/);
    assert.match(stale.stdout, /stand-in installer ran/);
    assert.equal(f.installs(), `${f.main}\n`);
});

test("after-remove points out a ROADMAP entry naming the work", (t) => {
    const f = fixture(t);
    write(f.main, ".arc/backlog/ROADMAP.md", "- sample: in progress\n");
    git(f.main, "add", ".");
    git(f.main, "commit", "-q", "-m", "roadmap");
    const result = f.run("after-remove", "sample");
    success(result);
    assert.match(result.stdout, /ROADMAP\.md mentions sample/);
});
