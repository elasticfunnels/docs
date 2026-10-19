# elasticfunnels-docs — working agreements

Customer documentation for ElasticFunnels (Mintlify, `docs.json` is the navigation). The product
code is `~/Work/elasticfunnels`; its `CLAUDE.md` requires a docs update here whenever a change alters
how a customer uses something.

# Who reads this repo

- **Customers**, at the published Mintlify site. Mintlify deploys on push to `main`, so a doc is not
  live until it is pushed.
- **The ElasticFunnels AI agent** (AI editor and site import, `~/Work/elasticfunnels-cc-runner`).
  The runner box keeps a read-only checkout at `/home/sam/elasticfunnels-docs` that its update
  worker fast-forwards every few minutes, and the agent is told to check it before guessing how a
  feature behaves. Unpushed commits never reach it.

# When you change a doc, check the agent's rules too

A docs change that describes how pages, template directives, the frontend engine, checkouts,
merchants, products, variants, bonuses, funnels or page events work means the agent may now be
following stale rules. In the same piece of work, check and update:

- the site-import rules: `~/Work/elasticfunnels/Modules/Pages/app/Services/SiteImport/SiteImportService.php`
  (REBUILD RULES and OFFER sections);
- the runner's brand guide and grounding: `~/Work/elasticfunnels-cc-runner/templates/CLAUDE-template.md`,
  `src/agent/grounding.ts`;
- the ef CLI agent block and skills the runner bundles: `~/Work/elasticfunnels-cli`.

If nothing there needed changing, say so in the commit message ("agent rules checked, no change").

# Writing rules

- Follow `~/.claude/copy-rules.md` (no em dashes, no invented experience).
- Facts come from the code or `.ef-docs/documentation for pitch decks etc/FEATURES_MASTER.md` in the
  app repo; never describe a feature that is not live as if it were.
- Brand name is ElasticFunnels, one word.

# Screenshots are required

Owner rule (2026-10-16): every page that describes a screen shows that screen, as a real annotated
screenshot of the live UI on the demo brand (899, Northwind Supplements). Never a mockup, never a
hand-drawn copy of the UI, never a real customer's brand.

- **A `{/* SCREENSHOT: ... */}` placeholder is a to-do, not a finished page.** A page that still has
  one is not done; replace it with the image when you touch the page.
- **Make every image with `tools/shots/`** (README there): one JSON spec per image, captured with
  Playwright at 2x and rendered as the annotated composite into `images/<section>/<name>.png`. Keep
  the spec in the repo so the shot can be re-taken after the UI changes.
- **The style, so every page looks the same:**
  - UI screens: the capture in a rounded frame with a thin dark border, on a large rounded
    light-grey panel (`#F5F6FA`). Each element you talk about gets a rounded outline and a dot,
    and a thin black leader line runs to a white callout box beside the shot. A "Click to enlarge"
    pill sits bottom right.
  - URLs and parameters (postbacks, buy links, tracking links): the URL in monospace with each part
    on its own pastel highlight, a dot and a leader line down to a callout under each part.
  - Callout copy is short: a bold title of 1 to 3 words (the label the user sees in the app when
    there is one) and one plain line of at most about 8 words on what it does.
  - Three to six callouts per image. More than that is two images.
- **Embed with a plain `<img>`**: `<img src="/images/emails/overview-list.png" alt="..." />`.
  Mintlify zooms images on click by default, which is what the pill promises; do not add
  `noZoom`, and do not wrap the image in `<Frame>` (the composite already has its frame). Write
  real alt text that says what the image shows.
- **Examples use a generic product.** The example product is **Acme Sleep Gummies**
  (codes `sleep-gummies`, `sleep-gummies-1/3/6`), the example brand **Acme Health**, example
  domains `example.com`. Never a real customer product or brand (Menosoothe, Herpafend, Glucotil
  and the like), not in prose, code, JSON or alt text.
