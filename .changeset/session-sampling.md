---
"@tindalabs/blindspot-core": minor
"@tindalabs/blindspot": patch
---

`sampling.rate` now samples whole sessions, as documented. It was applied per trace, and each route is its own trace, so at `rate: 0.5` every session exported a random half of its routes: funnels and session views had silent gaps. The decision now comes from a hash of `ux.session.id`, so a session is kept or dropped whole and keeps the same decision across reloads in the tab.

`sampling.errorAware` had the same flaw: it rolled `Math.random()` on every page hide, so each tab switch kept or dropped the spans since the last hide independently. It now uses the same session-level decision.

The processor's `commitSession()` no longer takes a `rate` argument; the decision is fixed when `init()` runs. Expect exported span volume to change for any `rate` below 1: the share of sessions stays the same, but every kept session is now complete.
