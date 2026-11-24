#!/usr/bin/env node
// Run one backend or end-to-end check in a throwaway Compose stack, then remove the stack. Built so a runner can run
// these checks beside other work: each run has its own project and port, and leaves nothing behind.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
    chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { constants } from "node:os";
import { basename, join } from "node:path";
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
const RUN_PROJECT = /^cinexplorer-run-\d{4}-[0-9a-f]{6}$/;
const FIRST_PORT = 8500;
const LAST_PORT = 8599;
const BUILT_SERVICES = ["backend", "frontend"];
const SAMPLE_MS = 5000;
// Variables the stack takes only from this run's Compose env file, never from the caller's shell.
const STACK_VARIABLES = ["SITE_PORT", "WORKTREE_SECRET_KEY", "STACK_CHECK_OWNER", "STACK_CHECK_DIR", "USER_UID", "USER_GID",
    "USERNS_MODE"];
const PLAYWRIGHT = "frontend/node_modules/.bin/playwright";
const LAUNCH = 'import { chromium } from "@playwright/test"; const browser = await chromium.launch(); await browser.close();';

// Every run by this account on a machine shares this folder, whatever its shell's environment: port claims, and each
// run's own folder of throwaway files, named for its project and holding its owner. It sits under /tmp, which every
// shell can write, sandboxed agent shells included; STACK_CHECK_SHARED moves it, for tests. (Windows has no getuid; the
// script refuses to run there before using the folder.)
const SHARED = process.env.STACK_CHECK_SHARED || join("/tmp", `cinexplorer-stack-check-${process.getuid?.()}`);
const CLAIMS = join(SHARED, "claims");
const RUNS = join(SHARED, "runs");

class NotRun extends Error {}

// The shared folder must be this account's own directory: one that is another account's, or a link to somewhere else,
// could hand a run someone else's claims or steer its teardown at their files. Runs on Linux only, since telling live
// runs from stale ones needs /proc.
function useSharedFolder() {
    if (!existsSync("/proc/self/stat")) throw new NotRun("needs Linux's /proc to tell live runs from stale ones");
    let failure;
    try {
        mkdirSync(SHARED, { recursive: true, mode: 0o700 });
    } catch (error) {
        // Whatever is in the way, such as a file or a broken link, is judged below
        failure = error;
    }
    let folder;
    try {
        folder = lstatSync(SHARED);
    } catch (error) {
        throw new NotRun(`couldn't create ${SHARED}: ${(failure ?? error).message}`);
    }
    if (!folder.isDirectory() || folder.uid !== process.getuid()) {
        throw new NotRun(`${SHARED} must be a directory this account owns`);
    }
    chmodSync(SHARED, 0o700);
}

const children = new Set();

function run(command, args, { cwd, env, inherit = false } = {}) {
    const child = spawn(command, args, { cwd, env, stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"] });
    children.add(child);
    let stdout = "";
    let output = "";
    child.stdout?.on("data", (chunk) => {
        stdout += chunk;
        output = (output + chunk).slice(-100000);
    });
    child.stderr?.on("data", (chunk) => { output = (output + chunk).slice(-100000); });
    const done = new Promise((resolve) => {
        const finish = (result) => {
            children.delete(child);
            resolve(result);
        };
        child.on("error", (error) => finish({ status: 127, stdout, output: `${command}: ${error.message}` }));
        child.on("close", (code, signal) => finish({ status: code ?? 128 + (constants.signals[signal] ?? 0), stdout, output }));
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

// A pid means something only in its own boot and PID namespace, so an owner records both.
function machine() {
    const boot = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim().replaceAll("-", "").slice(0, 12);
    const namespace = /\[(\d+)\]/.exec(readlinkSync("/proc/self/ns/pid"))?.[1];
    return { boot, namespace };
}

function ownerOf(pid) {
    const { boot, namespace } = machine();
    return `${boot}:${namespace}:${pid}:${startTime(pid)}`;
}

// Whether a run may still be going. An owner this process can't check, from another PID namespace or in an unknown
// form, counts as live, so a run is only ever removed once its end is certain.
function alive(owner) {
    const match = /^([0-9a-f]+):(\d+):(\d+):(\d+)$/.exec(owner ?? "");
    if (!match) return true;
    const { boot, namespace } = machine();
    if (match[1] !== boot) return false;
    if (match[2] !== namespace) return true;
    return startTime(match[3]) === match[4];
}

function statOf(pid) {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2).split(" ");
}

// Every process under these, read from /proc before any is signalled, so none is missed when its parent exits.
function descendantsOf(roots) {
    const parents = new Map();
    for (const pid of readdirSync("/proc").filter((name) => /^\d+$/.test(name))) {
        try {
            parents.set(Number(pid), Number(statOf(pid)[1]));
        } catch {
            // Ended meanwhile
        }
    }
    const found = new Set(roots);
    for (let grew = true; grew;) {
        grew = false;
        for (const [pid, parent] of parents) {
            if (!found.has(pid) && found.has(parent)) {
                found.add(pid);
                grew = true;
            }
        }
    }
    return [...found].filter((pid) => !roots.includes(pid));
}

// The engine behind the docker command: podman when podman's own command names itself on the Client line; podman's
// service when only the server section names podman, as Docker's CLI shows it in a component below the Server line
// (Docker's CLI lacks the podman commands that find podman's builds); otherwise Docker. A client's context name, in
// the client section, never counts.
function engineOf(version) {
    const client = /^Client:[^\n]*/m.exec(version.stdout)?.[0] ?? "";
    if (/podman/i.test(client)) return "podman";
    const server = version.stdout.search(/^Server:/m);
    return server !== -1 && /podman/i.test(version.stdout.slice(server)) ? "podman-service" : "docker";
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
    return engineOf(version);
}

async function listIds(kind, filter, env) {
    const listed = await run("docker", [kind, "ls", ...(kind === "container" ? ["-a"] : []), "-q", "--filter", filter], { env });
    return { ids: words(listed.stdout), problem: listed.status === 0 ? undefined : `${kind}s: ${lastLine(listed.output)}` };
}

// podman builds images inside its API service, and every build leaves its working containers behind, even one whose
// run was cancelled. Each run names itself to its builds in build arguments, its project and its owner, which buildah
// records with each working container. Returns the build containers whose record names a run, and what couldn't be
// read.
async function buildsOf(env) {
    // Buildah's container folders use full IDs, while podman lists short IDs by default.
    const list = () => run("docker", ["ps", "--external", "--all", "--no-trunc", "--format", "{{.ID}}"], { env });
    const listed = await list();
    if (listed.status !== 0) return { builds: [], problems: [`build containers: ${lastLine(listed.output)}`] };
    const ids = words(listed.stdout);
    if (!ids.length) return { builds: [], problems: [] };
    const info = await run("docker", ["info", "--format", "{{json .Store}}"], { env });
    let store;
    try {
        store = JSON.parse(info.stdout);
    } catch {
        // Reported below
    }
    if (typeof store?.graphRoot !== "string" || typeof store.graphDriverName !== "string") {
        return { builds: [], problems: [`build containers: no storage details: ${lastLine(info.output)}`] };
    }
    // buildah keeps its records under the graph root, whichever store podman lists the container in
    const folder = join(store.graphRoot, `${store.graphDriverName}-containers`);
    let local = false;
    const missingFolders = new Set();
    const builds = [];
    const problems = [];
    for (const id of ids) {
        const container = join(folder, id);
        const problem = `build containers: couldn't read the record of ${id.slice(0, 12)}`;
        let record;
        try {
            if (!statSync(container, { throwIfNoEntry: false })?.isDirectory()) {
                missingFolders.add(id);
                continue;
            }
            local = true;
            record = JSON.parse(readFileSync(join(container, "userdata", "buildah.json"), "utf8"));
        } catch (error) {
            // Only a build has a record, and its folder can disappear between the listing and the read.
            if (error.code !== "ENOENT") problems.push(problem);
            continue;
        }
        // A build made without arguments has no project or owner tags.
        const args = record?.Args ?? {};
        if (!record || typeof record !== "object" || Array.isArray(record) ||
            typeof args !== "object" || Array.isArray(args)) {
            problems.push(problem);
            continue;
        }
        const { STACK_CHECK_PROJECT: project, STACK_CHECK_OWNER: owner } = args;
        if (typeof project === "string") builds.push({ id, project, owner: typeof owner === "string" ? owner : undefined });
    }
    // The same path can name a store on another machine. Confirm a container with no folder is still listed,
    // since its folder can disappear when the container is removed.
    if (!local) {
        const relisted = await list();
        if (relisted.status !== 0) problems.push(`build containers: ${lastLine(relisted.output)}`);
        else if (words(relisted.stdout).some((id) => missingFolders.has(id))) {
            problems.push("build containers: podman's storage isn't on this machine");
        }
    }
    return { builds, problems };
}

// Signal this account's Compose commands that pass the run's project. Podman's Compose provider can outlive the
// command that started it. Give the provider time to exit and close its connection before listing builds.
async function endComposeOf(project) {
    let signalled = [];
    for (const pid of readdirSync("/proc").filter((name) => /^\d+$/.test(name))) {
        if (Number(pid) === process.pid) continue;
        try {
            if (statSync(`/proc/${pid}`).uid !== process.getuid()) continue;
            const args = readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0");
            const matches = args.some((arg, i) => arg === `--project-name=${project}` ||
                ((arg === "-p" || arg === "--project-name") && args[i + 1] === project));
            if (!matches || !args.some((arg) => arg === "compose" || basename(arg).endsWith("-compose"))) continue;
            const started = statOf(pid)[19];
            process.kill(Number(pid), "SIGTERM");
            signalled.push({ pid, started });
        } catch {
            // Ended meanwhile
        }
    }
    for (const deadline = performance.now() + 3000; signalled.length;) {
        signalled = signalled.filter(({ pid, started }) => {
            try {
                const stat = statOf(pid);
                return stat[0] !== "Z" && stat[19] === started;
            } catch {
                return false;
            }
        });
        const remaining = deadline - performance.now();
        if (!signalled.length || remaining <= 0) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining)));
    }
    if (signalled.length) return `compose: ${signalled.length} still running`;
}

// Removes one run's image builds on podman: their working containers. A build counts as the run's only when its
// record names the run's project and owner, or, with no owner given, an owner that has ended. A step already running
// in podman's service runs to its end, and the service starts no further one once the run's Compose processes have
// gone. Before listing a second time, wait a second and check Compose again, since a build can add a container as
// it stops. Report only the latest Compose observation. After a cancel, look twice even if the first list was empty.
async function removeBuilds(project, owner, env, { always, composeProblem }) {
    const problems = new Set();
    const containers = new Set();
    for (const look of [1, 2]) {
        if (look === 2) {
            if (!always && !containers.size) break;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            composeProblem = await endComposeOf(project);
        }
        const found = await buildsOf(env);
        for (const problem of found.problems) problems.add(problem);
        for (const build of found.builds) {
            const mine = owner ? build.owner === owner : build.owner && !alive(build.owner);
            if (build.project === project && mine) containers.add(build.id);
        }
    }
    if (containers.size) {
        const removed = await run("docker", ["rm", "--force", "--ignore", ...containers], { env });
        if (removed.status !== 0) problems.add(`build containers: ${lastLine(removed.output)}`);
    }
    return { composeProblem, problems: [...problems] };
}

// Removes one run's stack: containers, volumes and networks by Compose's project label; images by this run's label and
// by the names Compose gives them, since podman's builds can lack Compose's labels; then the run's folder, unless
// keepFolderOnProblem is set and there are problems. Returns those problems, including any earlier ones. Only this
// script's project names are accepted, so it can't reach another stack. The run's Compose processes end first, given
// time to exit, so podman's service starts no further build step; on podman the run's builds go next, before its
// images. owner and always are removeBuilds' own.
async function tearDown(project, env, engine, { owner, always = false, keepFolderOnProblem = false, earlierProblems = [] } = {}) {
    if (!RUN_PROJECT.test(project)) throw new Error(`refusing to remove ${project}: not a stack-check project`);
    let composeProblem = await endComposeOf(project);
    let problems = [];
    if (engine === "podman") {
        ({ composeProblem, problems } = await removeBuilds(project, owner, env, { always, composeProblem }));
    } else if (engine === "podman-service") {
        problems.push("builds: only podman's own command can find podman's builds");
    }
    if (composeProblem) problems.unshift(composeProblem);
    for (const kind of ["container", "volume", "network"]) {
        const { ids, problem } = await listIds(kind, `label=com.docker.compose.project=${project}`, env);
        if (problem) problems.push(problem);
        if (!ids.length) continue;
        if (kind === "container") await run("docker", ["container", "stop", "-t", "5", ...ids], { env });
        const removed = await run("docker", [kind, "rm", ...(kind === "container" ? ["-f"] : []), ...ids], { env });
        if (removed.status !== 0) problems.push(`${kind}s: ${lastLine(removed.output)}`);
    }
    const labelled = await listIds("image", `label=${PROJECT_LABEL}=${project}`, env);
    if (labelled.problem) problems.push(labelled.problem);
    const names = new Set(BUILT_SERVICES.map((service) => `${project}-${service}`));
    const listed = await run("docker", ["image", "ls", "--format", "{{.ID}} {{.Repository}} {{.Tag}}"], { env });
    if (listed.status !== 0) problems.push(`images: ${lastLine(listed.output)}`);
    const named = listed.stdout.split("\n").map((line) => line.trim().split(/\s+/))
        .filter(([id, repository]) => id && repository && names.has(repository.split("/").at(-1)))
        .map(([id, repository, tag]) => ({ id, ref: tag && tag !== "<none>" ? `${repository}:${tag}` : id }));
    // An image both lists find goes by its name alone: naming it twice in one call fails on Docker once it's gone.
    const covered = (id) => named.some((image) => image.id.startsWith(id) || id.startsWith(image.id));
    const images = words([...labelled.ids.filter((id) => !covered(id)), ...named.map((image) => image.ref)].join(" "));
    if (images.length) {
        const removed = await run("docker", ["image", "rm", ...images], { env });
        if (removed.status !== 0) problems.push(`images: ${lastLine(removed.output)}`);
    }
    problems.unshift(...earlierProblems);
    if (!keepFolderOnProblem || !problems.length) rmSync(join(RUNS, project), { recursive: true, force: true });
    return problems;
}

function report(project, problems, done) {
    console.log(problems.length ? `stack-check: couldn't remove all of ${project}: ${problems.join("; ")}` : done);
}

// The owner and project labels on each resource, one inspection per resource where a batch fails, since a resource can
// go between listing and inspecting it.
async function labelsOf(kind, ids, env) {
    const labels = kind === "container" || kind === "image" ? ".Config.Labels" : ".Labels";
    const inspect = (batch) => run("docker", [kind, "inspect", "--format",
        `{{index ${labels} "${OWNER_LABEL}"}} {{index ${labels} "${PROJECT_LABEL}"}}`, ...batch], { env });
    const all = await inspect(ids);
    const outputs = all.status === 0 ? [all.stdout] : await Promise.all(ids.map(async (id) => (await inspect([id])).stdout));
    return outputs.join("\n").split("\n").map((line) => line.trim().split(/\s+/)).filter(([, project]) => project);
}

// Removes every stack whose run has ended without removing it, found by this script's labels and run folders only, so
// worktree and main stacks are never touched.
async function sweep(env, engine) {
    const owners = new Map();
    const record = (project, owner) => {
        if (RUN_PROJECT.test(project ?? "")) owners.set(project, [...(owners.get(project) ?? []), owner]);
    };
    for (const kind of ["container", "volume", "network", "image"]) {
        const { ids } = await listIds(kind, `label=${OWNER_LABEL}`, env);
        if (ids.length) for (const [owner, project] of await labelsOf(kind, ids, env)) record(project, owner);
    }
    if (engine === "podman") {
        const { builds, problems } = await buildsOf(env);
        for (const { project, owner } of builds) record(project, owner);
        if (problems.length) console.log(`stack-check: couldn't check every build for runs that ended: ${problems.join("; ")}`);
    }
    for (const project of existsSync(RUNS) ? readdirSync(RUNS) : []) {
        try {
            record(project, readFileSync(join(RUNS, project, "owner"), "utf8").trim());
        } catch {
            // A folder without its owner can't be checked, so it stays.
        }
    }
    for (const [project, found] of owners) {
        if (found.some(alive)) continue;
        report(project, await tearDown(project, env, engine), `stack-check: removed ${project}, left by a run that ended`);
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
    mkdirSync(CLAIMS, { recursive: true });
    const tag = owner.replaceAll(":", "_");
    for (let port = FIRST_PORT; port <= LAST_PORT; port++) {
        const mine = `${port}_${tag}`;
        writeFileSync(join(CLAIMS, mine), "");
        const rivals = readdirSync(CLAIMS).filter((name) => name.startsWith(`${port}_`) && name !== mine).filter((name) => {
            if (alive(name.slice(`${port}_`.length).replaceAll("_", ":"))) return true;
            rmSync(join(CLAIMS, name), { force: true });
            return false;
        });
        if (!rivals.length && await portFree(port)) return { port, claim: join(CLAIMS, mine) };
        rmSync(join(CLAIMS, mine), { force: true });
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
    const parents = new Map();
    for (const pid of readdirSync("/proc").filter((entry) => /^\d+$/.test(entry))) {
        const stat = (() => { try { return readFileSync(`/proc/${pid}/stat`, "utf8"); } catch { return ""; } })();
        const parent = stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1];
        if (parent) parents.set(parent, [...(parents.get(parent) ?? []), pid]);
    }
    let total = 0;
    for (const pending = [String(root)]; pending.length;) {
        const pid = pending.pop();
        try {
            total += Number(/^VmRSS:\s+(\d+) kB/m.exec(readFileSync(`/proc/${pid}/status`, "utf8"))?.[1] ?? 0) * 1024;
        } catch {
            continue;
        }
        pending.push(...(parents.get(pid) ?? []));
    }
    return total;
}

// Samples the stack's containers, plus the specs' Playwright and Chromium processes once they start, until stopped.
function sampleMemory(project, env, { browser, browserRoot }) {
    const peak = { total: 0, stack: 0, browser: 0, seen: false };
    let stopped = false;
    let wake = () => {};
    const loop = (async () => {
        while (!stopped) {
            const stats = await run("docker", ["stats", "--no-stream", "--format", "{{.Name}}\t{{.MemUsage}}"], { env });
            let stack = 0;
            for (const [name, usage] of stats.stdout.split("\n").map((line) => line.split("\t"))) {
                const bytes = name?.startsWith(`${project}-`) ? toBytes(usage?.split("/")[0]) : undefined;
                if (bytes === undefined) continue;
                stack += bytes;
                peak.seen = true;
            }
            const used = browserRoot() ? treeBytes(browserRoot()) : 0;
            peak.stack = Math.max(peak.stack, stack);
            peak.browser = Math.max(peak.browser, used);
            peak.total = Math.max(peak.total, stack + used);
            if (!stopped) await new Promise((resolve) => { wake = resolve; setTimeout(resolve, SAMPLE_MS); });
        }
    })();
    return async () => {
        stopped = true;
        wake();
        await loop;
        const mib = (bytes) => `${Math.round(bytes / 1024 ** 2).toLocaleString("en-US")} MiB`;
        const parts = [peak.seen ? `stack ${mib(peak.stack)}` : "stack unavailable"];
        if (browser) parts.push(`Playwright and Chromium ${mib(peak.browser)}`);
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
        ...(engine === "docker" ? [] : ["USERNS_MODE=keep-id"]), "",
    ].join("\n"));
    // Throwaway values, which take precedence over any the backend finds in the checkout: tests replace TMDB, and mail
    // goes nowhere.
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
    useSharedFolder();
    const env = cleanEnv();
    const engine = await preflight(mode, env);
    await sweep(env, engine);
    const owner = ownerOf(process.pid);
    const { port, claim } = await claimPort(owner);
    const project = `cinexplorer-run-${port}-${randomBytes(3).toString("hex")}`;
    const folder = join(RUNS, project);
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "owner"), owner);
    const compose = ["compose", "-p", project, "--env-file", join(folder, "compose.env"), ...FILES.flatMap((file) => ["-f", file])];
    // On cancel: stop this run's own processes, each with everything under it (podman's compose command runs Compose as
    // its own child, which would otherwise stay connected and keep a build going). Node can know a child has exited
    // before its pipes close, so use its child handle and look for descendants only under live children. Take the
    // stack down in a detached process so this one exits at once.
    const onSignal = (signal) => {
        const roots = [...children].filter((child) => child.exitCode === null && child.signalCode === null)
            .map((child) => child.pid).filter(Boolean);
        const descendants = descendantsOf(roots);
        for (const child of children) child.kill("SIGTERM");
        for (const pid of descendants) {
            try {
                process.kill(pid, "SIGTERM");
            } catch {
                // Ended meanwhile
            }
        }
        spawn(process.execPath, [SCRIPT, "--tear-down", project, "--engine", engine], { detached: true, stdio: "ignore", env })
            .unref();
        rmSync(claim, { force: true });
        process.exit(128 + constants.signals[signal]);
    };
    for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(signal, onSignal);
    const started = Date.now();
    const seconds = (since) => `${Math.round((Date.now() - since) / 1000)} s`;
    console.log(`stack-check: ${mode} in ${project} (${engine})`);
    let stopSampling;
    let browserRoot;
    try {
        await writeStackFiles(folder, { project, port, owner, engine, env });
        stopSampling = sampleMemory(project, env, { browser: mode === "e2e", browserRoot: () => browserRoot });
        const profile = mode === "e2e" ? ["--profile", "browser"] : [];
        const up = await run("docker", [...compose, ...profile, "up", "-d", "--build", "--wait", "--quiet-pull",
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
        if (mode === "e2e") browserRoot = test.child.pid;
        return (await test).status;
    } finally {
        const summary = stopSampling && await stopSampling();
        const removing = Date.now();
        const problems = await tearDown(project, env, engine, { owner });
        rmSync(claim, { force: true });
        report(project, problems, `stack-check: removed the stack in ${seconds(removing)}`);
        if (summary) console.log(summary);
    }
}

async function main(args) {
    if (args[0] === "--tear-down") {
        if (!RUN_PROJECT.test(args[1] ?? "")) {
            console.error(`stack-check: --tear-down takes a stack-check project, not ${args[1] ?? "nothing"}`);
            return USAGE;
        }
        useSharedFolder();
        // A cancelled run passes its engine; otherwise the client says which it is
        let engine = args[2] === "--engine" ? args[3] : undefined;
        const earlierProblems = [];
        if (!engine) {
            const version = await run("docker", ["version"], { env: process.env });
            if (version.status !== 0) earlierProblems.push(`builds: couldn't tell the engine: ${lastLine(version.output)}`);
            engine = engineOf(version);
        }
        let owner;
        try {
            owner = readFileSync(join(RUNS, args[1], "owner"), "utf8").trim();
        } catch {
            // A run whose folder has gone: only builds whose owner has ended are its
        }
        // The cancelled run's teardown is silent. Its folder lets the next check retry and report the result.
        const problems = await tearDown(args[1], process.env, engine, { owner, always: true, keepFolderOnProblem: true, earlierProblems });
        report(args[1], problems, `stack-check: removed ${args[1]}`);
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
