#!/usr/bin/env node
// Run one backend or end-to-end check in a throwaway Compose stack, then remove the stack. Built so a runner can run
// these checks beside other work: each run has its own project and port, and leaves nothing behind.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { constants, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HELP = `Usage: node scripts/stack-check.mjs backend|e2e [argument...]
  Run from the checkout root. Builds a throwaway stack, runs one check in it and removes the stack.
  backend   pytest in the backend container; arguments pass to pytest.
  e2e       the end-to-end specs against the stack; arguments pass to Playwright.
Exits with the check's own status, or 75 after one "stack-check:" line when nothing could run.`;
const SCRIPT = fileURLToPath(import.meta.url);
const NOT_RUN = 75;
const USAGE = 64;
const FILES = ["infrastructure/docker-compose.yml", "infrastructure/docker-compose.worktree.yml", "infrastructure/docker-compose.run.yml"];
const OWNER_LABEL = "cinexplorer.stack-check.owner";
const PROJECT_LABEL = "cinexplorer.stack-check.project";
const FIRST_PORT = 8500;
const LAST_PORT = 8599;
const BUILT_SERVICES = ["backend", "frontend"];
const SAMPLE_MS = 5000;
// Variables the stack takes only from this run's Compose env file, never from the caller's shell.
const STACK_VARIABLES = ["SITE_PORT", "WORKTREE_SECRET_KEY", "STACK_CHECK_OWNER", "STACK_CHECK_DIR", "USER_UID", "USER_GID",
    "USERNS_MODE"];
const PLAYWRIGHT = "frontend/node_modules/.bin/playwright";
const LAUNCH = 'import { chromium } from "@playwright/test"; const browser = await chromium.launch(); await browser.close();';

class NotRun extends Error {}

function run(command, args, { cwd, env, inherit = false } = {}) {
    const child = spawn(command, args, { cwd, env, stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"] });
    let output = "";
    const keep = (chunk) => { output = (output + chunk).slice(-100000); };
    child.stdout?.on("data", keep);
    child.stderr?.on("data", keep);
    const done = new Promise((resolve) => {
        child.on("error", (error) => resolve({ status: 127, output: `${command}: ${error.message}` }));
        child.on("close", (code, signal) => resolve({ status: code ?? 128 + (constants.signals[signal] ?? 0), output }));
    });
    return Object.assign(done, { child });
}

function words(text) {
    return [...new Set(text.split(/\s+/).filter(Boolean))];
}

function lastLine(text) {
    return text.trim().split("\n").at(-1) ?? "";
}

// /proc/<pid>/stat field 22 is the process's start time; with the pid it names one process even after the pid is reused.
function startTime(pid) {
    try {
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19];
    } catch {
        return undefined;
    }
}

function alive(owner) {
    const match = /^(\d+):(\d+)$/.exec(owner ?? "");
    return Boolean(match) && startTime(match[1]) === match[2];
}

// The caller's environment, less what would steer the stack or the specs: Compose's own settings, the stack's
// variables, and a staging target or sign-in.
function cleanEnv() {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (key.startsWith("COMPOSE_") || STACK_VARIABLES.includes(key) || /^E2E_/.test(key)) delete env[key];
    }
    return env;
}

async function preflight(mode, env) {
    if (!existsSync("/proc/self/stat")) throw new NotRun("needs Linux's /proc to tell live runs from stale ones");
    const compose = await run("docker", ["compose", "version"], { env });
    if (compose.status !== 0) throw new NotRun(`no container engine: docker compose version failed: ${lastLine(compose.output)}`);
    const version = await run("docker", ["version"], { env });
    if (version.status !== 0) throw new NotRun(`the container engine isn't answering: ${lastLine(version.output)}`);
    for (const tool of mode === "e2e" ? ["openssl", "curl"] : ["openssl"]) {
        const found = await run(tool, ["--version"], { env });
        if (found.status === 127) throw new NotRun(`${tool} isn't installed`);
    }
    if (mode === "e2e") {
        if (!existsSync(PLAYWRIGHT)) throw new NotRun("frontend dependencies aren't installed; run npm ci in frontend");
        const install = await run(join(process.cwd(), PLAYWRIGHT), ["install", "chromium"], { cwd: "frontend", env });
        if (install.status !== 0) throw new NotRun(`Chromium couldn't be installed: ${lastLine(install.output)}`);
        const launch = await run(process.execPath, ["--input-type=module", "-e", LAUNCH], { cwd: "frontend", env });
        if (launch.status !== 0) {
            const missing = words((launch.output.match(/\blib[\w.+-]*\.so[\w.]*/g) ?? []).join(" "));
            throw new NotRun(missing.length ? `Chromium can't start; this machine lacks ${missing.join(", ")}`
                : `Chromium can't start: ${lastLine(launch.output)}`);
        }
    }
    return /podman/i.test(version.output) ? "podman" : "docker";
}

// Containers, volumes and networks go by Compose's project label; images by this run's label and by the names Compose
// gives them, since podman's builds can lack Compose's labels.
async function tearDown(project, env) {
    for (const kind of ["container", "volume", "network"]) {
        const listed = await run("docker", [kind, "ls", ...(kind === "container" ? ["-a"] : []), "-q",
            "--filter", `label=com.docker.compose.project=${project}`], { env });
        const ids = listed.status === 0 ? words(listed.output) : [];
        if (!ids.length) continue;
        if (kind === "container") await run("docker", ["container", "stop", "-t", "5", ...ids], { env });
        await run("docker", [kind, "rm", ...(kind === "container" ? ["-f"] : []), ...ids], { env });
    }
    const labelled = await run("docker", ["image", "ls", "-q", "--filter", `label=${PROJECT_LABEL}=${project}`], { env });
    const names = new Set(BUILT_SERVICES.map((service) => `${project}-${service}`));
    const listed = await run("docker", ["image", "ls", "--format", "{{.ID}} {{.Repository}} {{.Tag}}"], { env });
    const named = (listed.status === 0 ? listed.output : "").split("\n").map((line) => line.trim().split(/\s+/))
        .filter(([id, repository]) => id && repository && names.has(repository.split("/").at(-1)))
        .map(([id, repository, tag]) => (tag && tag !== "<none>" ? `${repository}:${tag}` : id));
    const images = words([...(labelled.status === 0 ? words(labelled.output) : []), ...named].join(" "));
    if (images.length) await run("docker", ["image", "rm", ...images], { env });
}

// Removes every stack whose run has ended without removing it. Only this script's labels are read, so worktree and
// primary stacks are never touched.
async function sweep(env) {
    const owners = new Map();
    for (const kind of ["container", "volume", "network", "image"]) {
        const listed = await run("docker", [kind, "ls", ...(kind === "container" ? ["-a"] : []), "-q",
            "--filter", `label=${OWNER_LABEL}`], { env });
        const ids = listed.status === 0 ? words(listed.output) : [];
        if (!ids.length) continue;
        const labels = kind === "container" || kind === "image" ? ".Config.Labels" : ".Labels";
        const inspected = await run("docker", [kind, "inspect", "--format",
            `{{index ${labels} "${OWNER_LABEL}"}} {{index ${labels} "${PROJECT_LABEL}"}}`, ...ids], { env });
        if (inspected.status !== 0) continue;
        for (const [owner, project] of inspected.output.split("\n").map((line) => line.trim().split(/\s+/))) {
            if (project?.startsWith("cinexplorer-run-")) owners.set(project, [...(owners.get(project) ?? []), owner]);
        }
    }
    for (const [project, found] of owners) {
        if (found.some(alive)) continue;
        await tearDown(project, env);
        console.log(`stack-check: removed ${project}, left by a run that ended`);
    }
}

function portFree(port) {
    return new Promise((resolve) => {
        const server = createServer();
        server.once("error", () => resolve(false));
        server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
    });
}

// Each run writes its own claim file, named for its port and owner, then keeps the port only if no other live run
// claims it. Two runs racing for one port both see each other and move on, so neither can share it.
async function claimPort(owner) {
    const folder = join(process.env.XDG_RUNTIME_DIR || "/tmp", "cinexplorer-stack-check");
    mkdirSync(folder, { recursive: true });
    const tag = owner.replace(":", "-");
    for (let port = FIRST_PORT; port <= LAST_PORT; port++) {
        const mine = `${port}-${tag}`;
        writeFileSync(join(folder, mine), "");
        const rivals = readdirSync(folder).filter((name) => name.startsWith(`${port}-`) && name !== mine).filter((name) => {
            if (alive(name.slice(`${port}-`.length).replace("-", ":"))) return true;
            rmSync(join(folder, name), { force: true });
            return false;
        });
        if (!rivals.length && await portFree(port)) return { port, claim: join(folder, mine) };
        rmSync(join(folder, mine), { force: true });
    }
    throw new NotRun(`no free port from ${FIRST_PORT} to ${LAST_PORT}`);
}

function toBytes(text) {
    const match = /^\s*([\d.]+)\s*([kKMGT]?)(i?)B\s*$/.exec(text ?? "");
    if (!match) return undefined;
    const power = " KMGT".indexOf(match[2].toUpperCase() || " ");
    return Number(match[1]) * (match[3] ? 1024 : 1000) ** power;
}

// Resident memory of a process and everything it started, from /proc.
function treeBytes(root) {
    const children = new Map();
    for (const pid of readdirSync("/proc").filter((entry) => /^\d+$/.test(entry))) {
        const stat = (() => { try { return readFileSync(`/proc/${pid}/stat`, "utf8"); } catch { return ""; } })();
        const parent = stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1];
        if (parent) children.set(parent, [...(children.get(parent) ?? []), pid]);
    }
    let total = 0;
    for (const pending = [String(root)]; pending.length;) {
        const pid = pending.pop();
        try {
            total += Number(/^VmRSS:\s+(\d+) kB/m.exec(readFileSync(`/proc/${pid}/status`, "utf8"))?.[1] ?? 0) * 1024;
        } catch {
            continue;
        }
        pending.push(...(children.get(pid) ?? []));
    }
    return total;
}

// Samples the stack's containers, plus the specs' Playwright and Chromium processes, until stopped.
function sampleMemory(project, env, browserRoot) {
    const peak = { total: 0, stack: 0, browser: 0, seen: false };
    let stopped = false;
    let wake = () => {};
    const loop = (async () => {
        while (!stopped) {
            const stats = await run("docker", ["stats", "--no-stream", "--format", "{{.Name}}\t{{.MemUsage}}"], { env });
            let stack = 0;
            for (const [name, usage] of stats.output.split("\n").map((line) => line.split("\t"))) {
                const bytes = name?.startsWith(`${project}-`) ? toBytes(usage?.split("/")[0]) : undefined;
                if (bytes === undefined) continue;
                stack += bytes;
                peak.seen = true;
            }
            const browser = browserRoot ? treeBytes(browserRoot) : 0;
            peak.stack = Math.max(peak.stack, stack);
            peak.browser = Math.max(peak.browser, browser);
            peak.total = Math.max(peak.total, stack + browser);
            if (!stopped) await new Promise((resolve) => { wake = resolve; setTimeout(resolve, SAMPLE_MS); });
        }
    })();
    return async () => {
        stopped = true;
        wake();
        await loop;
        const mib = (bytes) => `${Math.round(bytes / 1024 ** 2).toLocaleString("en-US")} MiB`;
        const parts = [peak.seen ? `stack ${mib(peak.stack)}` : "stack unavailable"];
        if (browserRoot) parts.push(`Playwright and Chromium ${mib(peak.browser)}`);
        return `stack-check: peak memory ${mib(peak.total)} (${parts.join(", ")})`;
    };
}

async function writeStackFiles(folder, { project, port, owner, engine, env }) {
    for (const logs of ["logs/backend", "logs/frontend"]) mkdirSync(join(folder, logs), { recursive: true });
    const secret = () => randomBytes(32).toString("hex");
    writeFileSync(join(folder, "compose.env"), [
        `COMPOSE_PROJECT_NAME=${project}`, `SITE_PORT=${port}`, `WORKTREE_SECRET_KEY=${secret()}`,
        `STACK_CHECK_OWNER=${owner}`, `STACK_CHECK_DIR=${folder}`,
        `USER_UID=${process.getuid()}`, `USER_GID=${process.getgid()}`,
        ...(engine === "podman" ? ["USERNS_MODE=keep-id"] : []), "",
    ].join("\n"));
    // Throwaway values only: tests replace TMDB, and mail goes nowhere.
    writeFileSync(join(folder, "backend.env"), [
        "ENVIRONMENT=development", "DEBUG=False",
        "POSTGRES_DB=cinexplorer_dev", "POSTGRES_USER=cinexplorer_user", "POSTGRES_PASSWORD=cinexplorer_dev_pass",
        `DJANGO_SECRET_KEY=${secret()}`, "TMDB_READ_ACCESS_TOKEN=dummy-token-for-checks",
        "ZEPTOMAIL_API_KEY=dummy-key-for-checks", "BACKEND_URL=https://localhost:8000",
        "EMAIL_BACKEND=django.core.mail.backends.dummy.EmailBackend", "",
    ].join("\n"));
    const certs = await run("openssl", ["req", "-x509", "-nodes", "-newkey", "rsa:2048", "-days", "2",
        "-keyout", join(folder, "key.pem"), "-out", join(folder, "cert.pem"),
        "-config", "infrastructure/dev-certs/localhost.cnf", "-extensions", "req_ext", "-subj", "/CN=localhost"], { env });
    if (certs.status !== 0) throw new NotRun(`openssl couldn't make the stack's certificate: ${lastLine(certs.output)}`);
    // Containers may run as other users than the caller, so everything here is readable to them.
    for (const file of ["key.pem", "cert.pem", "compose.env", "backend.env"]) chmodSync(join(folder, file), 0o644);
    chmodSync(folder, 0o755);
}

async function check(mode, extra) {
    const env = cleanEnv();
    const engine = await preflight(mode, env);
    await sweep(env);
    const owner = `${process.pid}:${startTime(process.pid)}`;
    const { port, claim } = await claimPort(owner);
    const project = `cinexplorer-run-${port}-${randomBytes(3).toString("hex")}`;
    const folder = mkdtempSync(join(tmpdir(), "cinexplorer-stack-check-"));
    const compose = ["compose", "-p", project, "--env-file", join(folder, "compose.env"), ...FILES.flatMap((file) => ["-f", file])];
    // On cancel, the stack comes down in a detached process so this one can exit at once.
    const onSignal = (signal) => {
        spawn(process.execPath, [SCRIPT, "--tear-down", project, folder], { detached: true, stdio: "ignore", env }).unref();
        rmSync(claim, { force: true });
        process.exit(128 + constants.signals[signal]);
    };
    for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(signal, onSignal);
    const started = Date.now();
    const seconds = (since) => `${Math.round((Date.now() - since) / 1000)} s`;
    console.log(`stack-check: ${mode} in ${project} (${engine})`);
    let status = 1;
    let summary;
    try {
        await writeStackFiles(folder, { project, port, owner, engine, env });
        const browser = mode === "e2e" ? ["--profile", "browser"] : [];
        const up = await run("docker", [...compose, ...browser, "up", "-d", "--build", "--wait", "--quiet-pull",
            ...(mode === "e2e" ? [] : ["dev-db", "redis", "backend"])], { env });
        const setup = [up];
        if (up.status === 0 && mode === "e2e") {
            for (const step of [["migrate", "--noinput"], ["seed_dev_data"]]) {
                setup.push(await run("docker", [...compose, "exec", "-T", "-e", "DJANGO_CONSOLE_LOG_LEVEL=INFO", "backend",
                    "python", "manage.py", ...step], { env }));
                if (setup.at(-1).status !== 0) break;
            }
            if (setup.at(-1).status === 0) {
                setup.push(await run("curl", ["--insecure", "--fail", "--silent", "--show-error", "--output", "/dev/null",
                    "--retry", "45", "--retry-all-errors", "--retry-delay", "2", `https://localhost:${port}/`], { env }));
            }
        }
        if (setup.at(-1).status !== 0) {
            const logs = await run("docker", [...compose, "logs", "--no-color", "--tail", "100", "backend"], { env });
            console.error(`${setup.at(-1).output.trim()}\n--- backend log ---\n${logs.output.trim()}`);
            console.error("stack-check: the stack didn't start");
            return 1;
        }
        console.log(`stack-check: stack ready in ${seconds(started)}`);
        const test = mode === "e2e"
            ? run("npm", ["run", "test:e2e", ...(extra.length ? ["--", ...extra] : [])], {
                cwd: "frontend",
                env: {
                    ...env, E2E_BASE_URL: `https://localhost:${port}`, E2E_TARGET: "local",
                    // Specs that reach into the stack themselves, such as the tracking fixtures, find it through these.
                    COMPOSE_FILE: FILES.join(":"), COMPOSE_PROJECT_NAME: project, COMPOSE_ENV_FILES: join(folder, "compose.env"),
                },
                inherit: true,
            })
            : run("docker", [...compose, "exec", "-T", "backend", "pytest", "-p", "no:cacheprovider", ...extra], { env, inherit: true });
        const stopSampling = sampleMemory(project, env, mode === "e2e" ? test.child.pid : undefined);
        status = (await test).status;
        summary = await stopSampling();
        return status;
    } finally {
        const removing = Date.now();
        await tearDown(project, env);
        rmSync(folder, { recursive: true, force: true });
        rmSync(claim, { force: true });
        console.log(`stack-check: removed the stack in ${seconds(removing)}`);
        if (summary) console.log(summary);
    }
}

async function main(args) {
    if (args[0] === "--tear-down") {
        await tearDown(args[1], process.env);
        if (args[2]) rmSync(args[2], { recursive: true, force: true });
        return 0;
    }
    const [mode, ...extra] = args;
    if (mode === "-h" || mode === "--help") {
        console.log(HELP);
        return 0;
    }
    if (mode !== "backend" && mode !== "e2e") {
        console.error(HELP);
        return USAGE;
    }
    if (!FILES.every((file) => existsSync(file))) {
        console.error("stack-check: run this from the checkout root");
        return USAGE;
    }
    return check(mode, extra);
}

main(process.argv.slice(2)).then((status) => process.exit(status), (error) => {
    console.error(`stack-check: ${error.message}`);
    process.exit(error instanceof NotRun ? NOT_RUN : 1);
});
