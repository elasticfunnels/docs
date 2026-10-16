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
  try { return await chromium.launch(); } catch (e) {
    const root = path.join(os.homedir(), "Library/Caches/ms-playwright");
    const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => /^chromium_headless_shell-\d+$/.test(d)).sort((a, b) => +b.split("-")[1] - +a.split("-")[1]) : [];
    for (const d of dirs) {
      const exe = path.join(root, d, "chrome-headless-shell-mac-arm64/chrome-headless-shell");
      if (fs.existsSync(exe)) return chromium.launch({ executablePath: exe });
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

const fill = (s, ctx) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k === "brand" ? ctx.brand_id : (ctx[k] ?? m)));

const SETTLE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`;

// ---- capture ------------------------------------------------------------------------------------------
async function capture(browser, spec, ctx) {
  const app = (process.env.EF_APP || "").replace(/\/$/, "");
  if (!app) throw new Error("EF_APP is not set (the app origin to capture from)");
  const origin = new URL(app).origin;
  const c = spec.capture;
  const vp = c.viewport || { width: 1440, height: 900 };
  const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: "light", locale: "en-US" });
  // Header auth only for the app's own origin. Read-only: every mutating request to the app is refused,
  // so a stray click can never save, delete or send anything.
  const allowPost = (c.allowPost || []).map((r) => new RegExp(r));
  await context.route("**/*", (route) => {
    const req = route.request();
    if (new URL(req.url()).origin !== origin) return route.continue();
    if (req.method() !== "GET" && req.method() !== "HEAD" && !allowPost.some((r) => r.test(req.url()))) {
      console.warn(`  blocked ${req.method()} ${req.url().replace(origin, "")}`);
      return route.fulfill({ status: 204, body: "" });
    }
    return route.continue({ headers: { ...req.headers(), "ef-access-key": ctx.access_key } });
  });
  const page = await context.newPage();
  const url = app + fill(c.path, ctx);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  if (c.path.includes("{brand}") && !new URL(page.url()).pathname.startsWith(`/${ctx.brand_id}`)) {
    throw new Error(`landed on ${page.url()}, not on demo brand ${ctx.brand_id}: refusing to capture`);
  }
  await page.addStyleTag({ content: SETTLE_CSS + (c.css || "") });
  if (c.waitFor) await page.waitForSelector(fill(c.waitFor, ctx), { timeout: 30000 });
  for (const a of c.actions || []) {
    if (a.click) await page.click(a.click);
    else if (a.hover) await page.hover(a.hover);
    else if (a.scroll) await page.locator(a.scroll).scrollIntoViewIfNeeded();
    else if (a.waitFor) await page.waitForSelector(a.waitFor, { timeout: 30000 });
    if (a.wait || a.click || a.hover) await page.waitForTimeout(a.wait || 600);
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

(async () => {
  const specs = fs.readdirSync(SPECS).filter((f) => f.endsWith(".json")).sort()
    .map((f) => ({ name: f.replace(/\.json$/, ""), ...JSON.parse(fs.readFileSync(path.join(SPECS, f), "utf8")) }))
    .filter((s) => !filter || s.name.includes(filter));
  if (!specs.length) throw new Error("no spec matched");
  const { chromium } = loadPlaywright();
  const browser = await launch(chromium);
  const needsApp = !flag("--compose-only") && specs.some((s) => s.capture);
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
