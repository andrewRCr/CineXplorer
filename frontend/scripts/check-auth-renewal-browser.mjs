/**
 * Real-browser renewal/logout regression with an HTTP-only cookie boundary.
 * Run: BROWSER_EXECUTABLE=/path/to/chrome npm run test:auth-browser
 * BROWSER_ENGINE may select chromium (default), firefox, or webkit with a compatible executable.
 * Without a system executable, install the matching browser with npx playwright-core install chromium.
 * No backend, provider credentials, or deployed environment is used.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright-core";

const root = resolve(import.meta.dirname, "..");
const engineName = process.env.BROWSER_ENGINE || "chromium";
const engine = { chromium, firefox, webkit }[engineName];
assert(engine, "BROWSER_ENGINE must be chromium, firefox, or webkit");
const cacheDir = await mkdtemp(resolve(tmpdir(), "auth-renewal-browser-"));
const entry = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { useAuth } from '/src/hooks/auth/useAuth.ts';
function Probe() {
  const auth = useAuth();
  const [operation, setOperation] = useState('ready');
  return React.createElement(React.Fragment, null,
    React.createElement('div', { role: 'status' }, auth.isAuthenticated ? auth.user?.username || 'loading' : 'signed out'),
    React.createElement('button', { onClick: async () => { await auth.logout(); setOperation('logout complete'); } }, 'Sign out'),
    React.createElement('button', { onClick: async () => {
      const result = await auth.login('new-viewer', 'fixture-password', sessionStorage.getItem('remember') === 'true');
      setOperation(result.success ? 'login complete' : 'login failed');
    } }, 'Sign in'),
    React.createElement('div', { role: 'log' }, operation));
}
createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter, null, React.createElement(Probe)));
`;
let scenario;
const account = (id) => ({
  id,
  username: id === 7 ? "old-viewer" : "new-viewer",
  email: null,
  first_name: null,
  last_name: null,
  full_name: null,
  email_verified: true,
});
const token = (id, expired = false) =>
  `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ user_id: id, token_type: "access", exp: expired ? 1 : Math.floor(Date.now() / 1000) + 300 })).toString("base64url")}.fixture-signature`;
const cookie = (value) =>
  `refresh_token=${value}; HttpOnly; Secure; SameSite=Lax; Path=/`;
const json = (res, body, headers = {}) => {
  res.writeHead(200, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};
async function until(promise, message) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), 20000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
function gate() {
  let release;
  const wait = new Promise((resolveWait) => {
    release = resolveWait;
  });
  return { wait, release };
}
const vite = await createServer({
  root,
  configFile: false,
  cacheDir,
  define: {
    "import.meta.env.VITE_BASE_URL": '""',
    "import.meta.env.VITE_BASE_API_URL": '""',
  },
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": resolve(root, "src") } },
  optimizeDeps: {
    entries: [],
    include: [
      "react",
      "react-dom/client",
      "react-router",
      "axios",
      "@chakra-ui/react",
    ],
  },
  server: { middlewareMode: true, hmr: false },
  plugins: [
    {
      name: "auth-renewal-probe",
      resolveId(id) {
        if (id === "/probe-entry.js") return "\0auth-renewal-probe";
      },
      load(id) {
        if (id === "\0auth-renewal-probe") return entry;
      },
    },
  ],
});
const server = http.createServer((req, res) => {
  void (async () => {
    if (req.url === "/") {
      const html = await vite.transformIndexHtml(
        "/",
        '<div id="root"></div><script type="module" src="/probe-entry.js"></script>',
      );
      res.setHeader("Content-Type", "text/html");
      res.end(html);
      return;
    }
    if (req.url === "/api/auth/refresh") {
      const active = scenario;
      active.refreshes++;
      const id = /refresh_token=new/.test(req.headers.cookie || "") ? 8 : 7;
      if (active.refreshes === 1) {
        const body = JSON.stringify({
          access_token: token(id),
          expires_in: 300,
          issued_at: new Date().toISOString(),
        });
        if (active.heldAt === "body") {
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Set-Cookie": cookie("old-rotated"),
          });
          res.write(body.slice(0, 1));
        }
        active.entered.release();
        await active.release.wait;
        if (active.heldAt === "headers")
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Set-Cookie": cookie("old-rotated"),
          });
        res.end(active.heldAt === "body" ? body.slice(1) : body);
        active.sent.release();
        return;
      }
      active.renewedIdentity = id;
      json(
        res,
        {
          access_token: token(id),
          expires_in: 300,
          issued_at: new Date().toISOString(),
        },
        { "Set-Cookie": cookie(id === 8 ? "new-rotated" : "old-rotated") },
      );
      return;
    }
    if (req.url === "/api/logout/") {
      json(
        res,
        { message: "Logged out successfully." },
        { "Set-Cookie": `${cookie("")}; Max-Age=0` },
      );
      return;
    }
    if (req.url === "/api/token/") {
      json(
        res,
        {
          username: "new-viewer",
          first_name: null,
          user_id: 8,
          access_token: token(8),
          email_verified: true,
        },
        { "Set-Cookie": cookie("new") },
      );
      return;
    }
    if (req.url === "/api/profile/") {
      const access = (req.headers.authorization || "").split(" ")[1];
      const payload = JSON.parse(
        Buffer.from(access.split(".")[1], "base64url").toString(),
      );
      json(res, account(payload.user_id));
      return;
    }
    if (req.url === "/api/csrf/") {
      json(
        res,
        {},
        { "Set-Cookie": "csrftoken=fixture-csrf; SameSite=Lax; Path=/" },
      );
      return;
    }
    if (req.url === "/api/cookie-identity") {
      json(res, { cookie: req.headers.cookie || "" });
      return;
    }
    if (req.url === "/api/logs/") {
      json(res, {});
      return;
    }
    if (req.url?.startsWith("/_allauth/")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end('{"status":401}');
      return;
    }
    vite.middlewares(req, res, () => {
      res.writeHead(404);
      res.end();
    });
  })().catch((error) => {
    if (!res.headersSent) res.writeHead(500);
    res.end(String(error));
  });
});
let browser;
const results = [];
try {
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://localhost:${server.address().port}`;
  browser = await engine.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
  });
  for (const storage of ["localStorage", "sessionStorage"]) {
    for (const heldAt of ["headers", "body"]) {
      for (const signInAgain of [false, true]) {
        scenario = {
          heldAt,
          refreshes: 0,
          entered: gate(),
          release: gate(),
          sent: gate(),
        };
        const context = await browser.newContext();
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await context.addCookies([
            {
              name: "refresh_token",
              value: "old",
              url: base,
              httpOnly: true,
              secure: true,
              sameSite: "Lax",
            },
          ]);
          await page.addInitScript(
            ({ storage, access }) => {
              window[storage].setItem("access_token", access);
              window[storage].setItem("isAuthenticated", "true");
              sessionStorage.setItem(
                "remember",
                String(storage === "localStorage"),
              );
              const original = window.setInterval.bind(window);
              window.setInterval = (callback, delay, ...args) => {
                if (delay === 60000) {
                  window.checkIdle = callback;
                  return -1;
                }
                return original(callback, delay, ...args);
              };
            },
            { storage, access: token(7) },
          );
          await page.goto(base);
          await page
            .getByRole("status")
            .filter({ hasText: "old-viewer" })
            .waitFor();
          await page.evaluate(
            ({ storage, expired }) => {
              window[storage].setItem("access_token", expired);
              window.checkIdle();
            },
            { storage, expired: token(7, true) },
          );
          await until(
            scenario.entered.wait,
            "Idle refresh did not reach the HTTP fixture",
          );
          await page.evaluate(async () => {
            const { refreshAccessToken } =
              await import("/src/services/apiClient.ts");
            window.oldRenewal = refreshAccessToken().then(
              () => "success",
              () => "ended",
            );
          });
          if (heldAt === "body") {
            await page.waitForFunction(async () =>
              (
                await (await fetch("/api/cookie-identity")).json()
              ).cookie.includes("refresh_token=old-rotated"),
            );
          }
          await page
            .getByRole("button", { name: "Sign out", exact: true })
            .click();
          await page
            .getByRole("log")
            .filter({ hasText: "logout complete" })
            .waitFor();
          assert.equal(
            await page.getByRole("status").textContent(),
            "signed out",
          );
          if (signInAgain) {
            await page
              .getByRole("button", { name: "Sign in", exact: true })
              .click();
            await page
              .getByRole("log")
              .filter({ hasText: "login complete" })
              .waitFor();
            await page
              .getByRole("status")
              .filter({ hasText: "new-viewer" })
              .waitFor();
          }
          scenario.release.release();
          await until(scenario.sent.wait, "Delayed response was not released");
          await page.evaluate(() => window.oldRenewal);
          const refreshCookie = (await context.cookies()).find(
            (value) => value.name === "refresh_token",
          );
          assert.equal(
            refreshCookie?.value,
            signInAgain ? "new" : undefined,
            `${storage}/${heldAt}: obsolete cookie`,
          );
          const saved = await page.evaluate(() => ({
            local: localStorage.getItem("access_token"),
            session: sessionStorage.getItem("access_token"),
          }));
          const chosen =
            storage === "localStorage" ? saved.local : saved.session;
          assert.equal(
            storage === "localStorage" ? saved.session : saved.local,
            null,
          );
          if (signInAgain) {
            assert.equal(
              JSON.parse(
                Buffer.from(chosen.split(".")[1], "base64url").toString(),
              ).user_id,
              8,
            );
            const nextIdentity = await page.evaluate(
              async ({ storage, expired }) => {
                window[storage].setItem("access_token", expired);
                const { refreshAccessToken } =
                  await import("/src/services/apiClient.ts");
                const renewed = await refreshAccessToken();
                return JSON.parse(
                  atob(
                    renewed.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
                  ),
                ).user_id;
              },
              { storage, expired: token(8, true) },
            );
            assert.equal(nextIdentity, 8);
            assert.equal(scenario.renewedIdentity, 8);
          } else {
            assert.equal(chosen, null);
            assert.equal(
              await page.getByRole("status").textContent(),
              "signed out",
            );
          }
          assert.deepEqual(errors, []);
          results.push({
            storage,
            heldAt,
            signInAgain,
            nextIdentity: signInAgain ? 8 : null,
            passed: true,
          });
        } catch (error) {
          results.push({
            storage,
            heldAt,
            signInAgain,
            passed: false,
            error: String(error),
          });
        } finally {
          scenario.release.release();
          await context.close();
        }
      }
    }
  }
  console.log(
    JSON.stringify(
      { engine: engineName, version: browser.version(), results },
      null,
      2,
    ),
  );
  if (results.some((result) => !result.passed)) process.exitCode = 1;
} finally {
  scenario?.release.release();
  await browser?.close();
  await vite.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  await rm(cacheDir, { recursive: true, force: true });
}
