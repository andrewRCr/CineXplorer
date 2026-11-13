import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(new URL("../../../.githooks/pre-commit", import.meta.url));
const ENV = {
    ...process.env, GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com",
};

function check(t, files) {
    const root = mkdtempSync(join(tmpdir(), "cx-pre-commit-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    execFileSync("git", ["init", "-q", "-b", "test-hook"], { cwd: root, env: ENV });
    for (const [path, contents] of files) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), contents);
        execFileSync("git", ["add", "--", path], { cwd: root, env: ENV });
    }
    return spawnSync("bash", [HOOK], { cwd: root, env: ENV, encoding: "utf8" });
}

test("pre-commit permits the helper's active-directory lookup and task-list fixtures", (t) => {
    const result = check(t, [
        ["scripts/worktree.mjs", 'const active = ".arc/active";\n'],
        ["scripts/worktree.test.mjs", 'const fixture = ".arc/active/technical/tasks-sample.md";\n'],
    ]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("pre-commit still blocks unrelated references beside permitted helper paths", (t) => {
    const cases = [
        ["scripts/worktree.mjs", 'const path = ".arc/active-other";\n'],
        ["scripts/worktree.test.mjs", 'const path = ".arc/active/technical/prd-sample.md";\n'],
        ["scripts/worktree.test.mjs", 'const path = ".arc/active/technical/tasks-sample.md.extra";\n'],
        ["scripts/worktree.mjs", 'const paths = [".arc/active", ".arc/backlog/other.md"];\n'],
        ["scripts/worktree.test.mjs", 'const paths = [".arc/active/technical/tasks-sample.md", ".arc/user/other"];\n'],
        ["frontend/sample.mjs", 'const path = ".arc/active";\n'],
    ];
    for (const entry of cases) {
        const result = check(t, [entry]);
        assert.notEqual(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout + result.stderr, /Meta-project references/);
    }
});
