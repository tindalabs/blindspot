---
"@tindalabs/blindspot": minor
"@tindalabs/blindspot-react": minor
"@tindalabs/blindspot-vue": minor
"@tindalabs/blindspot-svelte": minor
"@tindalabs/blindspot-next": minor
---

Span names no longer contain user-visible text or URLs. `privacy.piiPatterns` redacts attribute values but never span names, so labels and paths embedded in names were exported unredacted.

**Breaking for queries that match on full span names:**

| Span | Before | After | Specifics now only in |
|---|---|---|---|
| Route | `navigation /cart → /checkout` | `navigation` | `ux.route.from`, `ux.route.to` |
| Click | `click button[Place Order]` | `click button` | `ux.element.label` |
| Fetch | `POST /api/orders` | `POST` | `url.full` |

Queries that match on name prefixes, such as the bundled Grafana dashboard's `{span:name=~"navigation.*"}`, keep working. Filter on the attributes above instead of the name.

New: `beginRouteSpan({ from, to, trigger }, parentContext?)` ends the current route span and starts the next one. All framework integrations now use it, so route spans have the same shape everywhere.
