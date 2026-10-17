#!/usr/bin/env node
// Regression test: the demo access key reaches only the app origin, never a cross-origin redirect target.
//   PLAYWRIGHT_PATH=... node tools/shots/shoot.test.cjs
const http = require("http");
const assert = require("assert");
const os = require("os");
const path = require("path");
const { appRoute } = require("./shoot.cjs");

const KEY = "test-key-not-a-secret";
const seen = [];
function server(handler) {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => { seen.push({ port: s.address().port, url: req.url, key: req.headers["ef-access-key"] }); handler(req, res); });
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
}

(async () => {
  const tries = [process.env.PLAYWRIGHT_PATH, "playwright", path.join(os.homedir(), "Work/trackplay-app/node_modules/playwright")].filter(Boolean);
  let pw; for (const t of tries) { try { pw = require(t); break; } catch { /* next */ } }
  if (!pw) throw new Error("playwright not found: set PLAYWRIGHT_PATH");
  const other = await server((req, res) => { res.end("<p>other</p>"); });
  const otherOrigin = `http://127.0.0.1:${other.address().port}`;
  const app = await server((req, res) => {
    if (req.url === "/away") { res.writeHead(302, { location: `${otherOrigin}/land` }); return res.end(); }
    if (req.url === "/hop") { res.writeHead(302, { location: "/final" }); return res.end(); }
    res.end("<p>app</p>");
  });
  const appOrigin = `http://127.0.0.1:${app.address().port}`;
  const browser = await pw.chromium.launch();
  try {
    const context = await browser.newContext();
    await context.route("**/*", appRoute(appOrigin, { accessKey: KEY }));
    const page = await context.newPage();

    await page.goto(`${appOrigin}/away`);
    assert.strictEqual(page.url(), `${otherOrigin}/land`, "cross-origin redirect is still followed");
    assert.strictEqual(seen.find((r) => r.url === "/away").key, KEY, "app request carries the key");
    assert.strictEqual(seen.find((r) => r.url === "/land").key, undefined, "redirect target never gets the key");

    await page.goto(`${appOrigin}/hop`);
    assert.ok(await page.content().then((h) => h.includes("app")), "same-origin redirect renders the app page");
    assert.strictEqual(seen.find((r) => r.url === "/final").key, KEY, "same-origin redirect target keeps the key");
    console.log("ok: access key stays on the app origin across redirects");
  } finally {
    await browser.close(); app.close(); other.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
