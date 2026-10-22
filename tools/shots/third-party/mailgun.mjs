// Raw captures of Mailgun's own screens for emails/provider-keys/mailgun.mdx.
// Needs the owner's Mailgun login on this Mac (app-access skill: `app-access status mailgun`).
// Read-only: it only navigates and opens menus. Account name, key IDs, key descriptions and the
// masked signing key are blurred in the page before the screenshot. Writes, per shot,
// tools/shots/source/<name>.png (2x, cropped) and prints the CSS boxes to use in the spec.
//   cd ~/.claude/skills/app-access/scripts && \
//   MG_ACCOUNT='<account name shown top right>' MG_BLUR='<regex of names to blur>' \
//   node <repo>/tools/shots/third-party/mailgun.mjs
// Both come from the environment so no account or person name lives in this public repo.
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const AA = (await import(os.homedir() + '/.claude/skills/app-access/scripts/lib.cjs')).default;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SRC = path.join(ROOT, 'tools/shots/source');
const ACCOUNT = process.env.MG_ACCOUNT;
const NAMES = process.env.MG_BLUR;
if (!ACCOUNT || !NAMES) { console.error('Set MG_ACCOUNT and MG_BLUR (see the header).'); process.exit(2); }

const BLUR = (names) => {
  const nameRe = new RegExp(names, 'i');
  // Blur the text itself (wrapped in a span), so icons next to it stay sharp.
  const blurText = (n) => { const sp = document.createElement('span'); sp.style.filter = 'blur(7px)'; sp.style.display = 'inline-block'; n.parentNode.insertBefore(sp, n); sp.appendChild(n); };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const hits = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim();
    if (!t) continue;
    if (nameRe.test(t)                  // account owner and company
      || /^[0-9a-f]{6,}-[0-9a-f]{6,}$/i.test(t)         // API key IDs
      || /^\*{4,}/.test(t)                              // masked signing key tail
      || /^ST$/.test(t)) hits.push(n);                  // avatar initials
  }
  hits.forEach(blurText);
  document.querySelectorAll('[class*=avatar i], [class*=Avatar]').forEach((el) => { el.style.filter = 'blur(7px)'; });
  // key descriptions: the Description column of the API keys table
  document.querySelectorAll('table').forEach((tb) => {
    const heads = [...tb.querySelectorAll('th')].map((th) => th.innerText.trim());
    const i = heads.indexOf('Description');
    if (i < 0) return;
    tb.querySelectorAll('tbody tr').forEach((tr) => { const td = tr.children[i]; if (td) td.style.filter = 'blur(7px)'; });
  });
  // plan and usage summary at the top of the account menu
  const sending = [...document.querySelectorAll('body *')].find((el) => el.children.length === 0 && /^Sending:/.test(el.textContent.trim()));
  let blk = sending; while (blk && !/Upgrade plan/.test(blk.innerText || '')) blk = blk.parentElement;
  if (blk && blk.innerText.length < 400) blk.style.filter = 'blur(7px)';
};

const box = async (page, sel, crop) => {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) return null;
  return [Math.round(b.x - crop.x), Math.round(b.y - crop.y), Math.round(b.width), Math.round(b.height)];
};

const shots = [
  {
    name: 'mailgun-account-menu',
    url: 'https://app.mailgun.com/dashboard',
    before: async (p) => { await p.click('text=' + ACCOUNT); await p.waitForTimeout(1200); },
    crop: { x: 1136, y: 0, width: 304, height: 770 },
    marks: { menu: '[aria-haspopup], button:near(:text("' + ACCOUNT + '"))', apiSecurity: 'text=API Security' },
  },
  {
    name: 'mailgun-api-keys',
    url: 'https://app.mailgun.com/settings/api_security',
    crop: { x: 256, y: 60, width: 1176, height: 660 },
    marks: { createKey: 'button:has-text("Create key")', signingTitle: 'text=HTTP webhook signing key', copy: 'button:right-of(:text("HTTP webhook signing key"))' },
  },
  {
    name: 'mailgun-region',
    url: 'https://app.mailgun.com/mg/sending/domains',
    before: async (p) => { await p.click('button:has-text("US")'); await p.waitForTimeout(1200); },
    crop: { x: 1024, y: 0, width: 416, height: 170 },
    marks: { region: 'button:has-text("US")', eu: 'text=EU' },
    hideRows: true,
  },
];

const { page, close } = await AA.launch('mailgun', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
try {
  for (const s of shots) {
    await page.goto(s.url, { waitUntil: 'domcontentloaded' });
    await AA.settle(page);
    await page.waitForTimeout(4000);
    await AA.assertLoggedIn('mailgun', page);
    if (s.hideRows) await page.addStyleTag({ content: 'table tbody, main table { visibility: hidden !important; }' });
    if (s.before) await s.before(page);
    await page.evaluate(BLUR, NAMES);
    await page.waitForTimeout(300);
    const boxes = {};
    for (const [k, sel] of Object.entries(s.marks)) boxes[k] = await box(page, sel, s.crop).catch(() => null);
    await page.screenshot({ path: path.join(SRC, s.name + '.png'), clip: s.crop });
    console.log(s.name, JSON.stringify({ size: [s.crop.width, s.crop.height], boxes }));
  }
} finally { await close(); }
