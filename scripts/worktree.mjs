import { spawnSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const COMPOSE = ["compose", "-f", "infrastructure/docker-compose.yml", "-f", "infrastructure/docker-compose.worktree.yml"];
const HELP = `Usage: node scripts/worktree.mjs <command>

  create <type>/<name> [--existing | --work-unit]
      Create and provision a worktree. --existing checks out an existing branch.
      --work-unit writes the starting notes for planned work.
  provision
      Copy development files, allocate a port and key, and install dependencies.
  browse
      Start the worktree's app, migrate and seed its development database.
  remove <name> [--keep-branch]
      Remove a clean merged worktree and its stack; optionally keep its branch.
`;

function run(cwd, command, args) {
    const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`.trim());
    }
    return result.stdout.trim();
}

function git(cwd, ...args) {
    return run(cwd, "git", args);
}

function context() {
    const root = git(process.cwd(), "rev-parse", "--show-toplevel");
    const main = dirname(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"));
    return { root, main };
}

function linked(root, main) {
    if (root === main) throw new Error("Run from a linked worktree, not the main checkout.");
}

function nameOf(root, main) {
    const prefix = `${basename(main)}.`;
    const folder = basename(root);
    const name = (folder.startsWith(prefix) ? folder.slice(prefix.length) : folder).toLowerCase();
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error("Worktree name must contain only letters, digits and hyphens.");
    return name;
}

function readEnv(root) {
    const path = join(root, "infrastructure/.env");
    return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function envValue(contents, key) {
    const value = contents.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1].trim();
    return value?.replace(/^(['"])(.*)\1$/, "$2");
}

function worktrees(main) {
    return git(main, "worktree", "list", "--porcelain").split("\n\n").map((block) => {
        const lines = block.split("\n");
        return {
            path: lines.find((line) => line.startsWith("worktree "))?.slice(9),
            branch: lines.find((line) => line.startsWith("branch "))?.slice(7).replace(/^refs\/heads\//, ""),
            locked: lines.some((line) => /^locked(?: |$)/.test(line)),
        };
    }).filter((entry) => entry.path);
}

function allocatePort(root, main) {
    const claimed = new Set(worktrees(main).filter((entry) => entry.path !== root)
        .map((entry) => Number(envValue(readEnv(entry.path), "SITE_PORT"))));
    for (let port = 8445; port <= 8499; port++) if (!claimed.has(port)) return port;
    throw new Error("No free worktree port in the range 8445 to 8499.");
}

function provisionEnv(root, main) {
    const name = nameOf(root, main);
    let contents = existsSync(join(root, "infrastructure/.env")) ? readEnv(root) : readEnv(main);
    const additions = [];
    if (envValue(contents, "COMPOSE_PROJECT_NAME") === undefined) additions.push(`COMPOSE_PROJECT_NAME=cinexplorer-${name}`);
    if (envValue(contents, "SITE_PORT") === undefined) additions.push(`SITE_PORT=${allocatePort(root, main)}`);
    if (envValue(contents, "WORKTREE_SECRET_KEY") === undefined) {
        const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
        const key = Array.from({ length: 50 }, () => alphabet[randomInt(alphabet.length)]).join("");
        additions.push(`WORKTREE_SECRET_KEY=${key}`);
    }
    if (additions.length) {
        if (contents && !contents.endsWith("\n")) contents += "\n";
        writeFileSync(join(root, "infrastructure/.env"), contents + additions.join("\n") + "\n");
    }
}

function provision(root, main) {
    linked(root, main);
    nameOf(root, main);
    const included = git(main, "ls-files", "--others", "--ignored", `--exclude-from=${join(root, ".worktreeinclude")}`, "-z");
    for (const file of included.split("\0").filter(Boolean)) {
        const target = join(root, file);
        if (existsSync(target)) continue;
        const ignored = spawnSync("git", ["check-ignore", "-q", "--", file], { cwd: root, encoding: "utf8" });
        if (ignored.error) throw ignored.error;
        if (ignored.status === 1) continue;
        if (ignored.status !== 0) throw new Error(ignored.stderr || "git check-ignore failed");
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(join(main, file), target);
    }
    for (const folder of [".venv-backend", ".claude", ".codex"]) {
        const target = join(root, folder);
        if (!lstatSync(target, { throwIfNoEntry: false })) symlinkSync(join(main, folder), target, "dir");
    }
    provisionEnv(root, main);
    const config = run(root, "docker", [...COMPOSE, "config"]);
    const project = config.match(/^name:\s*(\S+)\s*$/m)?.[1];
    const expected = `cinexplorer-${nameOf(root, main)}`;
    if (project !== expected) throw new Error(`Compose project must be ${expected}; resolved ${project ?? "[no name]"}.`);
    console.log(`name: ${project}`);
    for (const args of [["ci"], ["run", "typegen"]]) console.log(run(join(root, "frontend"), "npm", args));
}

function primary(root, main) {
    if (root !== main) throw new Error("Run this command from the main checkout.");
}

function create(root, main, branch, { existing, workUnit }) {
    primary(root, main);
    if (existing && workUnit) throw new Error("--work-unit cannot be combined with --existing.");
    const match = /^[a-z]+\/([a-z0-9][a-z0-9-]*)$/.exec(branch ?? "");
    if (!match) throw new Error("The branch must have the form {type}/{name} using lowercase letters, digits and hyphens.");
    const path = `${main}.${match[1]}`;
    if (lstatSync(path, { throwIfNoEntry: false })) throw new Error(`Worktree folder already exists: ${path}`);
    git(main, "fetch", "origin");
    const refs = git(main, "for-each-ref", "--format=%(refname)", "refs/heads/", "refs/remotes/origin/").split("\n");
    const local = refs.includes(`refs/heads/${branch}`);
    const remote = refs.includes(`refs/remotes/origin/${branch}`);
    if (!existing && (local || remote)) throw new Error(`Branch already exists: ${branch}. Use --existing to check it out.`);
    if (existing) {
        if (!local && !remote) throw new Error(`Branch does not exist locally or on origin: ${branch}`);
        if (worktrees(main).some((entry) => entry.branch === branch)) throw new Error(`Branch is checked out elsewhere: ${branch}`);
        const ref = local ? `refs/heads/${branch}` : `refs/remotes/origin/${branch}`;
        const override = spawnSync("git", ["cat-file", "-e", `${ref}:infrastructure/docker-compose.worktree.yml`], {
            cwd: main, encoding: "utf8",
        });
        if (override.error) throw override.error;
        if (override.status !== 0) throw new Error(`Branch lacks the worktree override; merge main into ${branch} first.`);
        git(main, "worktree", "add", path, branch);
    } else {
        git(main, "worktree", "add", "--no-track", "-b", branch, path, "origin/main");
    }
    try {
        provision(path, main);
    } catch (error) {
        throw new Error(`${error.message}\nRecover in ${path}: node scripts/worktree.mjs provision` +
            (workUnit ? "; then node .arc/reference/harness-hooks/seed-session-notes.mjs" : ""));
    }
    if (workUnit) {
        try {
            console.log(run(path, process.execPath, [".arc/reference/harness-hooks/seed-session-notes.mjs"]));
        } catch (error) {
            throw new Error(`${error.message}\nIn ${path}, run node .arc/reference/harness-hooks/seed-session-notes.mjs again.`);
        }
    }
    console.log(`Worktree: ${path}\nFirst push: git push -u origin ${branch}\nIn the worktree: node scripts/worktree.mjs browse`);
}

function browse(root, main) {
    linked(root, main);
    const contents = readEnv(root);
    for (const key of ["COMPOSE_PROJECT_NAME", "SITE_PORT", "WORKTREE_SECRET_KEY"]) {
        if (!envValue(contents, key)) throw new Error(`Missing ${key}; run node scripts/worktree.mjs provision first.`);
    }
    const compose = [...COMPOSE, "--profile", "browser"];
    console.log(run(root, "docker", [...compose, "up", "-d", "--wait"]));
    for (const args of [["migrate", "--noinput"], ["seed_dev_data"]]) {
        console.log(run(root, "docker", [...compose, "exec", "-T", "backend", "python", "manage.py", ...args]));
    }
    console.log(`https://localhost:${envValue(contents, "SITE_PORT")}\nSign in: dev / cinexplorer-dev`);
}

function main() {
    const [command, ...args] = process.argv.slice(2);
    if (command === "--help" || command === "-h") return console.log(HELP);
    if (!["create", "provision", "browse", "remove"].includes(command)) throw new Error(`Unknown command: ${command ?? "[none]"}. Use --help.`);
    const { root, main } = context();
    if (command === "provision" && args.length === 0) return provision(root, main);
    if (command === "browse" && args.length === 0) return browse(root, main);
    if (command === "create" && args.length >= 1 && args.slice(1).every((arg) => ["--existing", "--work-unit"].includes(arg))) {
        return create(root, main, args[0], { existing: args.includes("--existing"), workUnit: args.includes("--work-unit") });
    }
    throw new Error(`Unsupported arguments for ${command}. Use --help.`);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
