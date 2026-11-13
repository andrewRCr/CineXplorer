import { spawnSync } from "node:child_process";
import { randomInt } from "node:crypto";
import {
    accessSync, constants, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, symlinkSync,
    writeFileSync,
} from "node:fs";
import { basename, dirname, join, posix } from "node:path";

const COMPOSE = ["compose", "-f", "infrastructure/docker-compose.yml", "-f", "infrastructure/docker-compose.worktree.yml"];
const CLOSING = ".arc/reference/harness-hooks/finish-work.mjs";
const HELP = `Usage: node scripts/worktree.mjs <command>

  create <type>/<name> [--existing | --work-unit] [--no-install]
      Create and provision a worktree. --existing checks out an existing branch.
      --work-unit writes the starting notes for planned work.
      --no-install provisions files and project settings without Docker, npm installs or typegen.
  provision
      Copy development files, allocate a port and key, and install dependencies.
  browse
      Start the worktree's app, migrate and seed its development database.
  overlap <path>...
      Advisory report for every other worktree; paths are literal and repository-root-relative.
      Show non-merge commits reachable from its HEAD but not origin/main, plus uncommitted edits.
      Mark work units by their committed branch-matched task list; never fetch or change files.
      Exit 0 even with overlap; usage and Git errors exit non-zero.
  remove <name> [--keep-branch] [--no-stack]
      Remove a clean merged worktree and its stack; optionally keep its branch.
      --no-stack skips Docker cleanup; remove any leftover project containers and volumes later.
  finish <name> [--no-stack]
      Close a merged worktree: update main, run the repository's closing steps,
      remove the worktree, its stack and its branches, and stop before any push.
      --no-stack skips Docker cleanup; remove any leftover project containers and volumes later.
`;

function run(cwd, command, args, { trim = true } = {}) {
    const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`.trim());
    }
    return trim ? result.stdout.trim() : result.stdout;
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
    return git(main, "worktree", "list", "--porcelain", "-z").split("\0\0").map((block) => {
        const lines = block.split("\0");
        return {
            path: lines.find((line) => line.startsWith("worktree "))?.slice(9),
            branch: lines.find((line) => line.startsWith("branch "))?.slice(7).replace(/^refs\/heads\//, ""),
            locked: lines.some((line) => /^locked(?: |$)/.test(line)),
        };
    }).filter((entry) => entry.path);
}

function overlap(root, main, paths) {
    paths = [...new Set(paths.map((path) => {
        const normalized = posix.normalize(path).replace(/\/$/, "");
        if (!path || posix.isAbsolute(path) || normalized === ".." || normalized.startsWith("../")) {
            throw new Error("Supply literal repository-root-relative paths that stay inside the checkout.");
        }
        return normalized;
    }))];
    git(root, "rev-parse", "--verify", "origin/main^{commit}");
    const selected = (file) => paths.some((path) => path === "." || file === path || file.startsWith(`${path}/`));
    const listed = (path, ...args) => run(path, "git", ["--literal-pathspecs", ...args], { trim: false })
        .split("\0").filter(Boolean);
    const print = (label, files) => {
        const matches = [...new Set(files.filter(selected))].sort();
        console.log(`  ${label}:${matches.length ? "\n" + matches.map((file) => `    ${JSON.stringify(file)}`).join("\n") : " none"}`);
    };
    console.log("Advisory overlap report against origin/main (repository-root-relative paths)");
    for (const entry of worktrees(main).filter((entry) => entry.path !== root)) {
        const committed = listed(entry.path, "log", "--full-history", "--no-merges", "--format=", "--name-only", "-z", "--no-renames",
            "origin/main..HEAD", "--", ...paths);
        const status = listed(entry.path, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ...paths);
        const dirty = [];
        for (let i = 0; i < status.length; i++) {
            dirty.push(status[i].slice(3));
            if (/[RC]/.test(status[i].slice(0, 2))) dirty.push(status[++i]);
        }
        const slug = /^[a-z]+\/([a-z0-9][a-z0-9-]*)$/.exec(entry.branch ?? "")?.[1];
        const tasks = slug ? listed(entry.path, "ls-tree", "-r", "--name-only", "-z", "HEAD", "--", ".arc/active")
            .filter((file) => basename(file) === `tasks-${slug}.md`) : [];
        const kind = tasks.length ? `work unit: ${tasks.map((file) => JSON.stringify(file)).join(", ")}`
            : !entry.branch ? "detached" : entry.path === main ? "primary" : "errand";
        console.log(`\n${JSON.stringify(entry.path)} [${entry.branch ?? "detached"} | ${kind}]`);
        print("committed", committed);
        print("uncommitted", dirty);
    }
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

function checkedProject(root, main) {
    const config = run(root, "docker", [...COMPOSE, "config"]);
    const project = config.match(/^name:\s*(\S+)\s*$/m)?.[1];
    const expected = `cinexplorer-${nameOf(root, main)}`;
    if (project !== expected) throw new Error(`Compose project must be ${expected}; resolved ${project ?? "[no name]"}.`);
    return project;
}

function provision(root, main, { install = true } = {}) {
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
    for (const folder of [".venv-backend", ".claude"]) {
        const target = join(root, folder);
        const source = join(main, folder);
        if (existsSync(source) && !lstatSync(target, { throwIfNoEntry: false })) symlinkSync(source, target, "dir");
    }
    const codexSource = join(main, ".codex");
    const codexTarget = join(root, ".codex");
    const codexState = lstatSync(codexTarget, { throwIfNoEntry: false });
    if (existsSync(codexSource) && (!codexState || codexState.isDirectory())) {
        // Codex's sandbox requires a real .codex folder; its entries can remain shared.
        mkdirSync(codexTarget, { recursive: true });
        for (const entry of readdirSync(codexSource, { withFileTypes: true })) {
            const target = join(codexTarget, entry.name);
            if (!lstatSync(target, { throwIfNoEntry: false })) {
                symlinkSync(join(codexSource, entry.name), target, entry.isDirectory() ? "dir" : "file");
            }
        }
    }
    provisionEnv(root, main);
    const project = install ? checkedProject(root, main) : envValue(readEnv(root), "COMPOSE_PROJECT_NAME");
    console.log(`name: ${project}`);
    if (install) {
        for (const args of [["ci"], ["run", "typegen"]]) console.log(run(join(root, "frontend"), "npm", args));
    }
}

function primary(root, main) {
    if (root !== main) throw new Error("Run this command from the main checkout.");
}

function create(root, main, branch, { existing, workUnit, noInstall }) {
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
        provision(path, main, { install: !noInstall });
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
    const next = noInstall ? "Install later in the worktree: node scripts/worktree.mjs provision"
        : "In the worktree: node scripts/worktree.mjs browse";
    console.log(`Worktree: ${path}\nFirst push: git push -u origin ${branch}\n${next}`);
}

function browse(root, main) {
    linked(root, main);
    const contents = readEnv(root);
    for (const key of ["COMPOSE_PROJECT_NAME", "SITE_PORT", "WORKTREE_SECRET_KEY"]) {
        if (!envValue(contents, key)) throw new Error(`Missing ${key}; run node scripts/worktree.mjs provision first.`);
    }
    checkedProject(root, main);
    // Create the bind source as the host user before Docker can create it as root.
    mkdirSync(join(root, "frontend/logs"), { recursive: true });
    const compose = [...COMPOSE, "--profile", "browser"];
    console.log(run(root, "docker", [...compose, "up", "-d", "--wait"]));
    for (const args of [["migrate", "--noinput"], ["seed_dev_data"]]) {
        // Keep setup status and errors visible while suppressing DEBUG SQL on the console.
        console.log(run(root, "docker", [
            ...compose, "exec", "-T", "-e", "DJANGO_CONSOLE_LOG_LEVEL=INFO",
            "backend", "python", "manage.py", ...args,
        ]));
    }
    console.log(`https://localhost:${envValue(contents, "SITE_PORT")}\nSign in: dev / cinexplorer-dev`);
}

// Processes whose working directory is inside the worktree, such as a session still running there. /proc is read
// where it exists; another user's processes, and ones that exit while being read, are skipped.
function processesIn(path) {
    if (!existsSync("/proc") || !existsSync(path)) return [];
    const real = realpathSync(path);
    const found = [];
    for (const pid of readdirSync("/proc").filter((entry) => /^\d+$/.test(entry))) {
        let name;
        try {
            const cwd = readlinkSync(`/proc/${pid}/cwd`);
            if (cwd !== real && !cwd.startsWith(`${real}/`)) continue;
            name = readFileSync(`/proc/${pid}/comm`, "utf8").trim();
        } catch (error) {
            if (["ENOENT", "EACCES", "ESRCH"].includes(error.code)) continue;
            throw error;
        }
        found.push(`${pid} ${name}`);
    }
    return found;
}

function shellQuote(value) {
    return `'${value.replaceAll("'", "'\\''")}'`;
}

function checkDeletionPermissions(path) {
    const blockers = [];
    const uid = process.getuid?.();
    const gid = process.getgid?.();
    function block(target, reason, { sharedParent = false, sticky = false } = {}) {
        const quoted = shellQuote(target);
        const owner = lstatSync(target).uid === uid;
        let repair;
        if (sharedParent) {
            repair = owner ? [`chmod u+wx -- ${quoted}`] : ["Ask this parent directory's owner to grant write/search access."];
        } else if (uid === undefined || gid === undefined) {
            repair = ["Repair this path's deletion permissions manually."];
        } else {
            repair = owner ? [] : [`sudo chown -h ${uid}:${gid} -- ${quoted}`];
            if (!sticky) repair.push(`${owner ? "" : "sudo "}chmod u+rwx -- ${quoted}`);
        }
        blockers.push(`${target}: ${reason}\n  ${repair.join("\n  ")}`);
    }
    function accessible(directory, mode, sharedParent = false) {
        try {
            accessSync(directory, mode);
            return true;
        } catch (error) {
            if (!["EACCES", "EPERM"].includes(error.code)) throw error;
            block(directory, "missing directory access for deletion", { sharedParent });
            return false;
        }
    }
    function inspect(target, parent) {
        const stat = lstatSync(target);
        if (uid !== undefined && uid !== 0 && (parent.mode & 0o1000) && parent.uid !== uid && stat.uid !== uid) {
            block(target, "sticky parent directory prevents deletion", { sticky: true });
            return;
        }
        if (!stat.isDirectory()) return;
        let names;
        try {
            names = readdirSync(target);
        } catch (error) {
            if (!["EACCES", "EPERM"].includes(error.code)) throw error;
            block(target, "cannot list directory before deletion");
            return;
        }
        if (names.length && !accessible(target, constants.W_OK | constants.X_OK)) return;
        for (const name of names) inspect(join(target, name), stat);
    }
    const parent = dirname(path);
    if (accessible(parent, constants.W_OK | constants.X_OK, true)) inspect(path, lstatSync(parent));
    if (blockers.length) {
        throw new Error(`Deletion permission blockers; nothing was torn down or unregistered:\n${blockers.join("\n")}\n` +
            "Repair the listed paths manually, then retry; further blockers may become visible.");
    }
}

function checkRemoval(main, name, keepBranch) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name ?? "")) throw new Error("Supply a worktree name using lowercase letters, digits and hyphens.");
    const path = `${main}.${name}`;
    const entry = worktrees(main).find((candidate) => candidate.path === path);
    if (!entry) throw new Error(`Not a registered worktree: ${path}`);
    if (!entry.branch) throw new Error("Worktree must have a branch checked out; detached HEAD cannot be removed here.");
    const running = processesIn(path);
    if (running.length) {
        throw new Error(`Processes are running inside ${path}; end them first, such as a session there:\n  ${running.join("\n  ")}`);
    }
    checkDeletionPermissions(path);
    git(main, "fetch", "origin");
    if (!keepBranch) {
        const merged = spawnSync("git", ["merge-base", "--is-ancestor", entry.branch, "origin/main"], {
            cwd: main, encoding: "utf8",
        });
        if (merged.error) throw merged.error;
        if (merged.status === 1) throw new Error(`Branch ${entry.branch} is not merged into origin/main; use --keep-branch to preserve it.`);
        if (merged.status !== 0) throw new Error(merged.stderr || "git merge-base failed");
    }
    if (entry.locked) throw new Error("Worktree is locked; remove it with the tool that owns it.");
    if (git(path, "status", "--porcelain", "--untracked-files=all")) {
        throw new Error("Worktree has uncommitted or untracked files; keep it until they are resolved.");
    }
    const project = envValue(readEnv(path), "COMPOSE_PROJECT_NAME");
    const expected = `cinexplorer-${name}`;
    if (project && project !== expected) throw new Error(`Compose project must be ${expected}; found ${project}.`);
    return { path, branch: entry.branch, project };
}

function tearDown(main, { path, branch, project }, keepBranch, noStack) {
    if (noStack) {
        console.log(`Skipped Docker teardown for ${project ?? `cinexplorer-${nameOf(path, main)}`} (--no-stack). ` +
            "If a stack ran, remove its containers and volumes later.");
    }
    if (project && !noStack) {
        const filter = ["--filter", `label=com.docker.compose.project=${project}`, "-q"];
        for (const kind of ["container", "volume", "network", "image"]) {
            const listing = run(main, "docker", [kind, "ls", ...(kind === "container" ? ["-a"] : []), ...filter]);
            const ids = [...new Set(listing.split(/\s+/).filter(Boolean))];
            if (!ids.length) continue;
            if (kind === "container") console.log(run(main, "docker", [kind, "stop", ...ids]));
            console.log(run(main, "docker", [kind, "rm", ...ids]));
        }
    }
    git(main, "worktree", "remove", path);
    if (!keepBranch) {
        git(main, "branch", "--set-upstream-to=origin/main", branch);
        git(main, "branch", "-d", branch);
    }
    git(main, "fetch", "--prune");
    console.log(`Removed ${path}; ${keepBranch ? "kept" : "deleted"} branch ${branch}.`);
}

function remove(root, main, name, keepBranch, noStack) {
    primary(root, main);
    tearDown(main, checkRemoval(main, name, keepBranch), keepBranch, noStack);
}

function deleteRemoteBranch(main, branch) {
    const listing = spawnSync("git", ["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${branch}`], {
        cwd: main, encoding: "utf8",
    });
    if (listing.error) throw listing.error;
    if (listing.status === 2) return console.log(`Remote branch ${branch} is already gone.`);
    if (listing.status !== 0) throw new Error(listing.stderr || "git ls-remote failed");
    const head = listing.stdout.split(/\s/)[0];
    const merged = spawnSync("git", ["merge-base", "--is-ancestor", head, "origin/main"], { cwd: main, encoding: "utf8" });
    if (merged.error) throw merged.error;
    if (merged.status !== 0) return console.log(`Kept remote branch ${branch}: its head ${head.slice(0, 8)} is not on origin/main.`);
    git(main, "push", "--quiet", "origin", "--delete", branch);
    console.log(`Deleted remote branch ${branch}.`);
}

function closingStep(main, args, recovery) {
    try {
        const output = run(main, process.execPath, [CLOSING, ...args]);
        if (output) console.log(output);
    } catch (error) {
        throw new Error(`${error.message}\n${recovery}`);
    }
}

function finish(root, main, name, noStack) {
    primary(root, main);
    if (git(main, "branch", "--show-current") !== "main") throw new Error("The main checkout must be on main.");
    if (git(main, "status", "--porcelain", "--untracked-files=no")) {
        throw new Error("The main checkout has uncommitted changes to tracked files; commit or set them aside first.");
    }
    const removal = checkRemoval(main, name, false);
    git(main, "merge", "--ff-only", "--quiet", "origin/main");
    closingStep(main, ["before-remove", name], `Nothing was removed; resolve it, then run node scripts/worktree.mjs finish ${name} again.`);
    try {
        tearDown(main, removal, false, noStack);
    } catch (error) {
        throw new Error(`${error.message}\nRemoval stopped partway; resolve it, then run node scripts/worktree.mjs finish ${name} ` +
            `again while the worktree is still registered, or else node ${CLOSING} after-remove ${name}.`);
    }
    // The remote branch is the one step that can wait: report a failure and carry on to the closing steps.
    try {
        deleteRemoteBranch(main, removal.branch);
    } catch (error) {
        console.log(`Could not delete remote branch ${removal.branch}: ${error.message.split("\n")[0]}\n` +
            `Delete it later with git push origin --delete ${removal.branch}.`);
    }
    closingStep(main, ["after-remove", name], `The worktree is removed; resolve it, then run node ${CLOSING} after-remove ${name}.`);
}

function main() {
    const [command, ...args] = process.argv.slice(2);
    if (command === "--help" || command === "-h") return console.log(HELP);
    if (!["create", "provision", "browse", "remove", "finish", "overlap"].includes(command)) throw new Error(`Unknown command: ${command ?? "[none]"}. Use --help.`);
    const { root, main } = context();
    if (command === "overlap") {
        if (!args.length) throw new Error("Usage: node scripts/worktree.mjs overlap <path>...");
        return overlap(root, main, args);
    }
    if (command === "provision" && args.length === 0) return provision(root, main);
    if (command === "browse" && args.length === 0) return browse(root, main);
    if (command === "remove" && args.length >= 1 && args.length <= 3 &&
        args.slice(1).every((arg) => ["--keep-branch", "--no-stack"].includes(arg)) &&
        new Set(args.slice(1)).size === args.length - 1) {
        return remove(root, main, args[0], args.includes("--keep-branch"), args.includes("--no-stack"));
    }
    if (command === "finish" && (args.length === 1 || (args.length === 2 && args[1] === "--no-stack"))) {
        return finish(root, main, args[0], args.includes("--no-stack"));
    }
    if (command === "create" && args.length >= 1 && args.slice(1).every((arg) => ["--existing", "--work-unit", "--no-install"].includes(arg))) {
        return create(root, main, args[0], {
            existing: args.includes("--existing"), workUnit: args.includes("--work-unit"), noInstall: args.includes("--no-install"),
        });
    }
    throw new Error(`Unsupported arguments for ${command}. Use --help.`);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
