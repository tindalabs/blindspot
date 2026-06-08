---
"@tindalabs/blindspot-vue": patch
"@tindalabs/blindspot-svelte": patch
"@tindalabs/blindspot-next": patch
---

Fix: in-route activity (clicks, fetch, errors, form submits) now nests under the
navigation span instead of orphaning into its own root trace.

The Vue, Svelte, and Next.js (pages-router) integrations cleared the route span
in a step separate from re-creating it — Vue/Svelte in a `beforeEach` /
`beforeNavigate` guard, the Next pages-router on `routeChangeStart` — leaving a
window where the active context was root. Any span started in that window (and
intermittently the navigation-triggering click) became a standalone root trace.
The clear and re-create now happen atomically when the new route span is
established (`afterEach` / `afterNavigate` / `routeChangeComplete`), so a route
span is active at all times — matching the React and Next app-router adapters.
