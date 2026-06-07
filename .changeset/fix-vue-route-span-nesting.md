---
"@tindalabs/blindspot-vue": patch
---

Fix: in-route activity (clicks, fetch, errors, form submits) now nests under the
navigation span instead of orphaning into its own root trace. The Vue Router
integration cleared the route span in a separate `beforeEach` guard and only
re-created it in `afterEach`, leaving a window where the active context was root;
any span started in that gap (and intermittently the nav-link click that started
the navigation) became a standalone root trace. The clear and re-create now happen
atomically in `afterEach`, so a route span is active at all times — matching the
React adapter's behavior.
