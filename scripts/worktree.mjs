import { spawnSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
    provisionEnv(root, main);
}

function main() {
    const [command, ...args] = process.argv.slice(2);
    if (command === "--help" || command === "-h") return console.log(HELP);
    if (!["create", "provision", "browse", "remove"].includes(command)) throw new Error(`Unknown command: ${command ?? "[none]"}. Use --help.`);
    const { root, main } = context();
    if (command === "provision" && args.length === 0) return provision(root, main);
    throw new Error(`Unsupported arguments for ${command}. Use --help.`);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
