#!/usr/bin/env node
// Annotated docs images: capture the real app on the demo brand, then render the annotated composite.
//
//   node tools/shots/shoot.cjs                 every spec in tools/shots/specs
//   node tools/shots/shoot.cjs emails          specs whose name contains "emails"
//   node tools/shots/shoot.cjs --compose-only  re-render from tools/shots/raw/ without opening the app
//   node tools/shots/shoot.cjs --capture-only  capture raw shots, skip the composite
//
// Env: EF_APP (the app origin, required for capture), EF_DEMO_CONTEXT (demo-context.json with brand_id + access_key,
// default ~/Work/elasticfunnels/_dev/marketing/demo-context.json), PLAYWRIGHT_PATH. See README.md.
// Affiliate portal specs ("site": "portal"): EF_PORTAL (the portal origin on the local website runtime, e.g.
// http://partners.northwind.test:8093), EF_PORTAL_RESOLVE (the IP its host maps to, default 127.0.0.1) and
// EF_PORTAL_PASSWORD (the demo affiliate's password, never written anywhere).
const fs = require("fs");
const path = require("path");
const os = require("os");
const { screenHtml, urlHtml } = require("./compose.cjs");

const ROOT = path.resolve(__dirname, "../..");
const SPECS = path.join(__dirname, "specs");
const RAW = path.join(__dirname, "raw");
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const filter = args.find((a) => !a.startsWith("--"));

function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_PATH, "playwright", path.join(os.homedir(), "Work/trackplay-app/node_modules/playwright")].filter(Boolean);
  for (const t of tries) { try { return require(t); } catch { /* next */ } }
  throw new Error("playwright not found: set PLAYWRIGHT_PATH (tried " + tries.join(", ") + ")");
}

async function launch(chromium) {
  // The portal runs on a test hostname: point it at the local runtime instead of DNS.
  const portal = process.env.EF_PORTAL ? new URL(process.env.EF_PORTAL).hostname : null;
  const opts = portal ? { args: [`--host-resolver-rules=MAP ${portal} ${process.env.EF_PORTAL_RESOLVE || "127.0.0.1"}`] } : {};
  try { return await chromium.launch(opts); } catch (e) {
    const root = path.join(os.homedir(), "Library/Caches/ms-playwright");
    const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => /^chromium_headless_shell-\d+$/.test(d)).sort((a, b) => +b.split("-")[1] - +a.split("-")[1]) : [];
    for (const d of dirs) {
      const exe = path.join(root, d, "chrome-headless-shell-mac-arm64/chrome-headless-shell");
      if (fs.existsSync(exe)) return chromium.launch({ ...opts, executablePath: exe });
    }
    throw e;
  }
}

// The demo brand's context is read at runtime and never written anywhere: the access key stays in memory.
function demoContext() {
  const f = process.env.EF_DEMO_CONTEXT || path.join(os.homedir(), "Work/elasticfunnels/_dev/marketing/demo-context.json");
  if (!fs.existsSync(f)) throw new Error(`no demo context at ${f} (set EF_DEMO_CONTEXT)`);
  const ctx = JSON.parse(fs.readFileSync(f, "utf8"));
  if (!ctx.brand_id || !ctx.access_key) throw new Error(`${f} has no brand_id/access_key`);
  return ctx;
}

const fill = (s, ctx) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k === "brand" ? ctx?.brand_id ?? m : (ctx?.[k] ?? m)));

const SETTLE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`;

// Route handler for a capture context. The access key goes only to the app's own origin, and it is never
// carried across a redirect: Playwright applies route.continue() header overrides to every redirect the request
// initiates, cross-origin included, so the app request is fetched with maxRedirects 0.
function appRoute(origin, { accessKey, fixtures = [], allowPost = [] }) {
  return async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.origin !== origin) return route.continue();
    const fx = fixtures.find((f) => (f.method || "GET") === req.method() && f.re.test(u.pathname + u.search));
    if (fx) return route.fulfill({ status: 200, contentType: "application/json", body: fx.body });
    if (req.method() !== "GET" && req.method() !== "HEAD" && !allowPost.some((r) => r.test(req.url()))) {
      console.warn(`  blocked ${req.method()} ${req.url().replace(origin, "")}`);
      return route.fulfill({ status: 204, body: "" });
    }
    if (!accessKey) return route.continue();
    // Same-origin redirects are followed here with the key (the browser does not route a fulfilled redirect's
    // target again); the first redirect that leaves the origin goes back to the browser without the key.
    let url = req.url();
    let response;
    for (let hop = 0; hop <= 10; hop++) {
      response = await route.fetch({ url, headers: { ...req.headers(), "ef-access-key": accessKey }, maxRedirects: 0 });
      const loc = response.status() >= 300 && response.status() < 400 && response.headers()["location"];
      if (!loc) break;
      const next = new URL(loc, url);
      if (next.origin !== origin) break;
      url = next.href;
    }
    return route.fulfill({ response });
  };
}

// ---- capture ------------------------------------------------------------------------------------------
async function capture(browser, spec, ctx) {
  const c = spec.capture;
  const portal = c.site === "portal";
  const app = ((portal ? process.env.EF_PORTAL : process.env.EF_APP) || "").replace(/\/$/, "");
  if (!app) throw new Error(portal ? "EF_PORTAL is not set (the affiliate portal origin)" : "EF_APP is not set (the app origin to capture from)");
  const origin = new URL(app).origin;
  const vp = c.viewport || { width: 1440, height: 900 };
  const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: "light", locale: "en-US", timezoneId: "UTC" });
  // Portal specs sign in as a demo affiliate first (the only POST they make), then go read-only like the app.
  if (portal && c.login) {
    // "passwordEnv" names another env var, for a second demo affiliate (e.g. one still pending approval).
    const pwEnv = c.passwordEnv || "EF_PORTAL_PASSWORD";
    if (!process.env[pwEnv]) throw new Error(`${pwEnv} is not set`);
    const lp = await context.newPage();
    await lp.goto(app + "/affiliates/login", { waitUntil: "networkidle", timeout: 60000 });
    await lp.fill("#email", c.login);
    await lp.fill("#password", process.env[pwEnv]);
    await Promise.all([lp.waitForURL(/\/affiliates\/?$/, { timeout: 30000 }), lp.click("button[type=submit]")]);
    await lp.close();
  }
  // Header auth only for the app's own origin. Read-only: every mutating request to the app is refused,
  // so a stray click can never save, delete or send anything.
  const allowPost = (c.allowPost || []).map((r) => new RegExp(r));
  // Fixtures: a GET whose path+query matches answers with fictional JSON, for screens the demo seed has no data for.
  // `"method": "POST"` answers a read-only lookup the app sends as a POST (it never reaches the app).
  const fixtures = (c.fixtures || []).map((f) => ({ re: new RegExp(fill(f.url, ctx)), method: (f.method || "GET").toUpperCase(), body: fs.readFileSync(path.resolve(ROOT, f.file), "utf8") }));
  // The portal signs in with its own cookie: no access key there.
  await context.route("**/*", appRoute(origin, { accessKey: portal ? null : ctx.access_key, fixtures, allowPost }));
  const page = await context.newPage();
  const url = app + fill(c.path, ctx);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  if (!portal && c.path.includes("{brand}") && !new URL(page.url()).pathname.startsWith(`/${ctx.brand_id}`)) {
    throw new Error(`landed on ${page.url()}, not on demo brand ${ctx.brand_id}: refusing to capture`);
  }
  await page.addStyleTag({ content: SETTLE_CSS + (c.css || "") });
  if (c.waitFor) await page.waitForSelector(fill(c.waitFor, ctx), { timeout: 30000 });
  for (const a of c.actions || []) {
    if (a.click) await page.click(a.click);
    else if (a.hover) await page.hover(a.hover);
    else if (a.scroll) await page.locator(a.scroll).scrollIntoViewIfNeeded();
    else if (a.waitFor) await page.waitForSelector(a.waitFor, { timeout: 30000 });
    else if (a.select) await page.selectOption(a.select, String(a.value));
    else if (a.fill) await page.fill(a.fill, String(a.value));
    else if (a.eval) await page.evaluate(a.eval);
    if (a.wait || a.click || a.hover || a.select || a.fill || a.eval) await page.waitForTimeout(a.wait || 600);
  }
  for (const h of c.hide || []) await page.locator(h).evaluateAll((els) => els.forEach((e) => (e.style.visibility = "hidden")));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(c.settle ?? 800);

  // Frame: a crop selector (an element's box) or an explicit viewport rect; default the full viewport.
  let frame = { x: 0, y: 0, width: vp.width, height: vp.height };
  if (typeof c.crop === "string") {
    const b = await page.locator(c.crop).first().boundingBox();
    if (!b) throw new Error(`crop ${c.crop} not found`);
    frame = b;
  } else if (c.crop) frame = c.crop;
  const pad = c.cropPad || 0;
  frame = { x: Math.max(0, frame.x - pad), y: Math.max(0, frame.y - pad), width: frame.width + 2 * pad, height: frame.height + 2 * pad };

  const boxes = [];
  for (const a of spec.annotations || []) {
    if (a.box) { boxes.push(a.box); continue; }
    const b = await page.locator(a.selector).first().boundingBox();
    if (!b) throw new Error(`annotation "${a.title}": ${a.selector} not found`);
    boxes.push([b.x - frame.x, b.y - frame.y, b.width, b.height].map((v) => Math.round(v)));
  }
  const png = await page.screenshot({ clip: frame });
  await context.close();
  fs.mkdirSync(RAW, { recursive: true });
  fs.writeFileSync(path.join(RAW, spec.name + ".png"), png);
  fs.writeFileSync(path.join(RAW, spec.name + ".json"), JSON.stringify({ w: frame.width, h: frame.height, boxes, url: c.path, at: new Date().toISOString() }, null, 2));
  console.log(`  captured ${spec.name} (${Math.round(frame.width)}x${Math.round(frame.height)} CSS px)`);
}

// ---- compose ------------------------------------------------------------------------------------------
async function render(browser, html, out) {
  const context = await browser.newContext({ viewport: { width: 2400, height: 1600 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForSelector("body[data-ready]");
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.locator("#panel").screenshot({ path: out, omitBackground: true });
  await context.close();
}

async function compose(browser, spec) {
  const out = path.join(ROOT, spec.out);
  if (spec.kind === "url") {
    await render(browser, urlHtml(spec), out);
  } else {
    let meta, png;
    if (spec.image) {
      png = fs.readFileSync(path.resolve(ROOT, spec.image));
      const { w, h } = spec.imageSize; meta = { w, h, boxes: [] };
    } else {
      const f = path.join(RAW, spec.name + ".json");
      if (!fs.existsSync(f)) throw new Error(`no raw capture for ${spec.name}: run without --compose-only`);
      meta = JSON.parse(fs.readFileSync(f, "utf8"));
      png = fs.readFileSync(path.join(RAW, spec.name + ".png"));
    }
    const annotations = (spec.annotations || []).map((a, i) => ({ ...a, box: a.box || meta.boxes[i] }));
    const html = screenHtml({ ...spec, img: "data:image/png;base64," + png.toString("base64"), w: meta.w, h: meta.h, annotations });
    await render(browser, html, out);
  }
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  wrote ${spec.out} (${kb} KB)`);
  console.log(`    <img src="/${spec.out}" alt="${(spec.alt || "").replace(/"/g, "&quot;")}" />`);
}

if (require.main === module) (async () => {
  const specs = fs.readdirSync(SPECS).filter((f) => f.endsWith(".json")).sort()
    .map((f) => ({ name: f.replace(/\.json$/, ""), ...JSON.parse(fs.readFileSync(path.join(SPECS, f), "utf8")) }))
    .filter((s) => !filter || s.name.includes(filter));
  if (!specs.length) throw new Error("no spec matched");
  const { chromium } = loadPlaywright();
  const browser = await launch(chromium);
  const needsApp = !flag("--compose-only") && specs.some((s) => s.capture && s.capture.site !== "portal");
  const ctx = needsApp ? demoContext() : null;
  let failed = 0;
  for (const spec of specs) {
    console.log(spec.name);
    try {
      if (spec.capture && !flag("--compose-only")) await capture(browser, spec, ctx);
      if (!flag("--capture-only")) await compose(browser, spec);
    } catch (e) { failed++; console.error(`  FAILED: ${e.message}`); }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });

module.exports = { appRoute };
