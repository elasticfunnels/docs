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
