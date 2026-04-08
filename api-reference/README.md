# ElasticFunnels API documentation

Customer-facing reference for the ElasticFunnels HTTP API (`/api/brands/…` and related endpoints).

## Getting started

- [Introduction](/api-reference/introduction) — Overview
- [Quick start](/api-reference/quick-start) — Common patterns
- [Authentication](/api-reference/authentication) — `EF-Access-Key` and sessions
- [Security and sensitive data](/api-reference/endpoints/security-and-data) — Keys, billing metadata, permissions
- [Errors](/api-reference/errors) — Status codes and error payloads

## Endpoints (sidebar)

- **Analytics and dashboards** — [Analytics](/api-reference/endpoints/analytics), [Analytics dashboard cards](/api-reference/endpoints/analytics-cards)
- **Programmatic split tests** — [Overview](/api-reference/endpoints/programmatic-split-tests/overview) and linked pages
- **Core resources** — Brands, pages, products, funnels, conversions, subscriptions, tickets

## MCP

- [MCP server](/api-reference/mcp-server/introduction) — Optional AI / automation tooling

## Practices

1. Keep API keys out of source control and client-side bundles.
2. Use pagination and filters on list endpoints to limit payload size.
3. Retry failed requests with backoff; respect `429` / `5xx` semantics.

## Support

- Email: support@elasticfunnels.io
- Dashboard: https://app.elasticfunnels.io
