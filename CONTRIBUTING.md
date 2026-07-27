# Contributing to ElasticFunnels docs (Mintlify)

## Screenshot placeholders in MDX

Mintlify parses Guides as **MDX**. HTML-style `<!-- ... -->` comments break the parser when they sit in normal document flow. Use a **JSX block comment** on its **own line**, **directly above** where the final image should appear. These comments are **not shown** on the published docs site.

Format:

```mdx
{/* SCREENSHOT: Short screen name · what to capture · desktop or mobile · any notes */}
```

Example:

```mdx
{/* SCREENSHOT: Create Page hub · full card grid with AI hero and manual options · desktop 1440px */}
```

Use the same **English** labels visitors see in the app. Do not put repo paths or Vue filenames inside the comment. Do not use the sequence `*/` inside the comment text (it would end the comment early).

## Voice and review

Before you ship user-facing prose, read the brand voice guide in the main app repo:

`elasticfunnels/.ef-docs/marketing/_shared/brand-voice.md`

Avoid banned filler words from that doc, keep sentences short and specific, and do not use Unicode em dash or en dash in customer-facing copy (use a normal hyphen for ranges).

Self-review checklist for doc changes lives next to other execution rules:

`elasticfunnels/.ef-docs/execution-rules.md` (see **Self-review after each task**).

## In-app help links

The Laravel/Vue app uses `DocsLink` (`resources/js/components/DocsLink.vue` in the app repo) next to **complex** flows only, with tooltips translated via vue-i18n. Do not add docs icons to every simple list screen.
