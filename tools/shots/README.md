# tools/shots: annotated screenshots for the docs

Every docs page that describes a screen shows it as a real, annotated screenshot (rule and style:
`CLAUDE.md`, "Screenshots are required"). This folder makes them: one JSON spec per image, captured
from the app on the demo brand with Playwright, rendered as the annotated composite by the browser at
2x, written to `images/<section>/<name>.png`.

```bash
node tools/shots/shoot.cjs                      # every spec
node tools/shots/shoot.cjs emails               # specs whose file name contains "emails"
node tools/shots/shoot.cjs --compose-only       # re-render from tools/shots/raw/ (no app needed)
node tools/shots/shoot.cjs --capture-only       # capture only
```

Needs Node 18+ and Playwright. Nothing to install in this repo: it uses
`~/Work/trackplay-app/node_modules/playwright` (or `PLAYWRIGHT_PATH`), and falls back to the newest
`chromium_headless_shell` in `~/Library/Caches/ms-playwright`.

## Capture: where the app comes from

| Env | What |
|---|---|
| `EF_APP` | the app origin, e.g. `http://127.0.0.1:8010` (required for capture) |
| `EF_DEMO_CONTEXT` | demo context JSON with `brand_id` and `access_key` (default `~/Work/elasticfunnels/_dev/marketing/demo-context.json`, written by the app repo's demo seeder, see the `marketing-screenshots` skill) |

- The browser logs in with the `EF-Access-Key` header, sent only to `EF_APP`'s origin. The key is
  read at runtime and never written anywhere; never copy it into this repo.
- **Read-only.** Every POST, PUT, PATCH or DELETE to the app is answered with an empty 204 and logged
  as `blocked`, so a click can open a panel but never save, delete or send. If a screen needs a POST to
  read data (a search endpoint), allow that URL with `"allowPost": ["/api/.../search"]`.
- **No demo data for the screen?** Answer its endpoints with fictional JSON:
  `"fixtures": [{ "url": "/api/brands/{brand}/automations/21/events", "file": "tools/shots/fixtures/automation-runs/events.json" }]`.
  `url` is a regex tested against the request's path and query; the first match wins, so put the narrow
  one first. It is the real component with fixture data, never a mockup: keep the numbers plausible and
  every name generic.
- A spec whose path contains `{brand}` refuses to capture if the app lands on any other brand.
- Raw captures and the measured element boxes go to `tools/shots/raw/` (gitignored), so the
  composite can be re-rendered without the app.

## Spec: a UI screen

`tools/shots/specs/emails-overview-list.json`:

```json
{
  "out": "images/emails/overview-list.png",
  "alt": "The Emails list with the In use / All filter and the New email button",
  "capture": {
    "path": "/{brand}/emails",
    "viewport": { "width": 1440, "height": 900 },
    "waitFor": "table",
    "actions": [ { "click": "button.info" }, { "wait": 500 } ],
    "crop": "main",
    "cropPad": 0,
    "hide": [ ".toast" ]
  },
  "maxWidth": 760,
  "calloutWidth": 230,
  "annotations": [
    { "selector": "text=New email", "title": "New email", "text": "Starts a blank template" },
    { "selector": "[data-test=filter]", "title": "In use / All", "text": "Hides templates nothing sends", "side": "left" }
  ]
}
```

- `crop`: a selector (that element's box) or `{x, y, width, height}` in viewport CSS px; default the
  whole viewport. Crop to the part of the screen the page talks about: the sidebar is rarely it.
- `actions`: `click`, `hover`, `scroll` (selector), `waitFor` (selector), `wait` (ms), `select` (a `<select>`
  selector, with `value`: the option to choose), `fill` (an input selector, with `value`: the text to type). Playwright
  selectors work (`text=Save`, `role=button[name="Save"]`).
- `annotations[]`: `selector` (measured at capture) or `box: [x, y, w, h]` in CSS px of the cropped
  capture; `title` (1 to 3 words, the label in the app), `text` (one short line), `side` (`right`,
  default, or `left`; pick the side nearest the element so the leader line does not cross the screen),
  `pad` (outline padding, default 4).
- An existing PNG can stand in for the capture: `"image": "path.png", "imageSize": {"w": .., "h": ..}`
  with `box` annotations.

## Spec: a URL or parameter diagram

```json
{
  "kind": "url",
  "out": "images/integrations/redtrack-postback-url.png",
  "alt": "...",
  "segments": [
    { "text": "https://" },
    { "text": "track.example.com/postback", "title": "Postback domain", "desc": "Your tracking domain in RedTrack" },
    { "text": "?clickid={clickid}", "title": "Click ID", "desc": "The RedTrack click that gets the credit" }
  ]
}
```

A segment without a `title` is drawn plain. Callouts sit in one row when they fit under their parts,
otherwise in two alternating rows. Options: `fontSize` (17), `calloutWidth` (180), `color` per segment.

## Then

1. Look at the PNG before you use it: outlines on the right element, no callout over another, no
   real customer data, the sidebar user is the demo user.
2. Embed it where the placeholder was: `<img src="/images/emails/overview-list.png" alt="..." />`
   (Mintlify zooms on click; no `<Frame>`, no `noZoom`).
3. Commit the spec with the image.

The pipeline has nothing ElasticFunnels-specific except the demo-context login (`EF-Access-Key`), so
TrackPlay docs can copy this folder and swap `demoContext()`/the header for TrackPlay's own login.
