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

// Where a build runtime's mount table is read from: /proc/<pid>/mountinfo, or <STACK_CHECK_MOUNTS>/<pid>/mountinfo in
// tests, which can't mount layers. Everything else about processes, and every signal, uses the real /proc.
const MOUNTS = process.env.STACK_CHECK_MOUNTS || "/proc";

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

// A process that has ended, or that only waits for its parent to collect its exit status, is gone. A process this
// account can't read isn't counted as gone.
function gone(pid) {
    try {
        return statOf(pid)[0] === "Z";
    } catch (error) {
        return error.code === "ENOENT" || error.code === "ESRCH";
    }
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

// The engine behind the docker command: podman through its own command, podman's service through another client such
// as Docker's, which lacks the podman commands that find podman's builds, or Docker.
function engineOf(version) {
    if (!/podman/i.test(version.stdout)) return "docker";
    return /podman/i.test(version.stdout.split(/^Server:/m)[0]) ? "podman" : "podman-service";
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

// podman builds images inside its API service, so a run that ends during a build leaves the step it was running going
// there (the service starts no further step once the run's Compose client has gone), and every build leaves its
// working containers behind. Each run names itself to its builds in build arguments, its project and its owner, which
// buildah records with each working container. Returns the build containers whose record names a run, each with the
// layer podman's container store mounts it on, the storage driver, and what couldn't be read.
async function buildsOf(env) {
    const listed = await run("docker", ["ps", "--external", "--all", "--no-trunc", "--format", "{{.ID}}"], { env });
    if (listed.status !== 0) return { builds: [], problems: [`build containers: ${lastLine(listed.output)}`] };
    const ids = words(listed.stdout);
    if (!ids.length) return { builds: [], problems: [] };
    const info = await run("docker", ["info", "--format", "{{json .Store}}"], { env });
    let store;
    try {
        store = JSON.parse(info.stdout);
    } catch {
        return { builds: [], problems: [`build containers: no storage details: ${lastLine(info.output)}`] };
    }
    // A transient store keeps its container records under the run root
    const folder = join(store.transientStore ? store.runRoot : store.graphRoot, `${store.graphDriverName}-containers`);
    // Build containers are in the volatile container store, others in the main one
    const layers = new Map();
    for (const file of ["containers.json", "volatile-containers.json"]) {
        try {
            for (const { id, layer } of JSON.parse(readFileSync(join(folder, file), "utf8"))) layers.set(id, layer);
        } catch {
            // A store podman hasn't written yet; a build container it should list is reported where it matters
        }
    }
    const builds = [];
    const problems = [];
    for (const id of ids) {
        let record;
        try {
            record = JSON.parse(readFileSync(join(folder, id, "userdata", "buildah.json"), "utf8"));
        } catch (error) {
            // Only a build's containers have a record, and one removed since the listing has none either
            if (error.code !== "ENOENT") problems.push(`build containers: couldn't read the record of ${id.slice(0, 12)}`);
            continue;
        }
        const { STACK_CHECK_PROJECT: project, STACK_CHECK_OWNER: owner } = record.Args ?? {};
        if (project) builds.push({ id, project, owner, layer: layers.get(id) });
    }
    return { builds, driver: store.graphDriverName, problems };
}

// The build steps running on these layers. A step runs under buildah's OCI runtime, which runs as this account in the
// step's bundle folder, with the build container's layer mounted at mnt/rootfs as the step's root; the bundle's pid
// file names the step's first process. A layer belongs to one container only, so no other build's step can match.
function stepsOn(layers) {
    const steps = [];
    const problems = [];
    for (const pid of readdirSync("/proc").filter((name) => /^\d+$/.test(name))) {
        let bundle;
        try {
            if (basename(readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0")[0]) !== "buildah-oci-runtime") continue;
            if (statSync(`/proc/${pid}`).uid !== process.getuid()) continue;
            bundle = readlinkSync(`/proc/${pid}/cwd`);
        } catch {
            continue;
        }
        let mounts;
        try {
            mounts = readFileSync(join(MOUNTS, pid, "mountinfo"), "utf8");
        } catch (error) {
            if (error.code !== "ENOENT") problems.push(`build steps: couldn't read the mounts of build runtime ${pid}`);
            continue;
        }
        const rootfs = join(bundle, "mnt", "rootfs");
        const mount = mounts.split("\n").map((line) => line.split(" ")).find((fields) => fields[4] === rootfs);
        const layer = /(?:^|,)upperdir=[^,]*\/([^/,]+)\/diff(?:,|$)/.exec(mount?.at(-1) ?? "")?.[1];
        // A runtime that hasn't mounted its step's root yet is found by the next look
        if (!layers.has(layer)) continue;
        try {
            const step = Number(readFileSync(join(bundle, "pid"), "utf8").trim());
            if (Number(statOf(step)[1]) === Number(pid)) steps.push({ pid: step, runtime: Number(pid), start: statOf(step)[19] });
        } catch {
            // The step's first process hasn't started yet, or has ended
        }
    }
    return { steps, problems };
}

// Ends build steps. A step's first process is the first of its own PID namespace, which ignores SIGTERM, so SIGKILL,
// which ends the namespace's other processes with it. Each is checked again just before its signal: still its
// runtime's child, and the same process. Returns what couldn't be ended.
async function endSteps(steps) {
    const signalled = [];
    const problems = [];
    for (const { pid, runtime, start } of steps) {
        try {
            const stat = statOf(pid);
            if (Number(stat[1]) !== runtime || stat[19] !== start) continue;
            process.kill(pid, "SIGKILL");
            signalled.push(pid);
        } catch (error) {
            if (error.code === "EPERM") problems.push(`build steps: not allowed to end ${pid}`);
        }
    }
    const until = Date.now() + 5000;
    while (signalled.some((pid) => !gone(pid)) && Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 100));
    const running = signalled.filter((pid) => !gone(pid));
    if (running.length) problems.push(`build steps: ${running.length} still running`);
    return problems;
}

// Stops one run's image builds on podman: ends their running steps, then removes their working containers. A build
// counts as the run's only when its record names the run's project and owner, or, with no owner given, an owner that
// has ended. It looks again a second later, since a step's runtime starts a moment before it mounts the step's root
// and a build can add a container as it stops; after a cancel it always looks twice, since the build may not have
// added its first container yet.
async function stopBuilds(project, owner, env, { always }) {
    const problems = new Set();
    const containers = new Set();
    for (const look of [1, 2]) {
        if (look === 2) {
            if (!always && !containers.size) break;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        const found = await buildsOf(env);
        for (const problem of found.problems) problems.add(problem);
        const mine = found.builds.filter((build) => build.project === project
            && (owner ? build.owner === owner : build.owner && !alive(build.owner)));
        if (!mine.length) continue;
        if (found.driver !== "overlay") problems.add(`build steps: can't find steps on ${found.driver} storage`);
        for (const { id, layer } of mine) {
            containers.add(id);
            if (!layer) problems.add(`build steps: couldn't tell which are ${id.slice(0, 12)}'s`);
        }
        const { steps, problems: unread } = stepsOn(new Set(mine.map((build) => build.layer).filter(Boolean)));
        for (const problem of [...unread, ...await endSteps(steps)]) problems.add(problem);
    }
    if (containers.size) {
        const removed = await run("docker", ["rm", "--force", "--ignore", ...containers], { env });
        if (removed.status !== 0) problems.add(`build containers: ${lastLine(removed.output)}`);
    }
    return [...problems];
}

// Removes one run's stack: containers, volumes and networks by Compose's project label; images by this run's label and
// by the names Compose gives them, since podman's builds can lack Compose's labels; then the run's folder. Returns
// what it couldn't remove. Only this script's project names are accepted, so it can't reach another stack. On podman,
// its image builds go first, so a build can't finish into an image after the images are removed; owner and always are
// stopBuilds' own.
async function tearDown(project, env, engine, { owner, always = false } = {}) {
    if (!RUN_PROJECT.test(project)) throw new Error(`refusing to remove ${project}: not a stack-check project`);
    const problems = engine === "podman" ? await stopBuilds(project, owner, env, { always })
        : engine === "podman-service" ? ["builds: only podman's own command can find podman's builds"] : [];
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
    rmSync(join(RUNS, project), { recursive: true, force: true });
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
    // its own child, which would otherwise stay connected and keep a build going), and take the stack down in a
    // detached process so this one exits at once.
    const onSignal = (signal) => {
        const roots = [...children].map((child) => child.pid).filter(Boolean);
        for (const pid of [...roots, ...descendantsOf(roots)]) {
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
        const problems = [];
        if (!engine) {
            const version = await run("docker", ["version"], { env: process.env });
            if (version.status !== 0) problems.push(`builds: couldn't tell the engine: ${lastLine(version.output)}`);
            engine = engineOf(version);
        }
        let owner;
        try {
            owner = readFileSync(join(RUNS, args[1], "owner"), "utf8").trim();
        } catch {
            // A run whose folder has gone: only builds whose owner has ended are its
        }
        problems.push(...await tearDown(args[1], process.env, engine, { owner, always: true }));
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
