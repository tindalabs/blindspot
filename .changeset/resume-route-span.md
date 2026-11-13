---
'@tindalabs/blindspot': minor
---

Reopen the route span when a user returns to a hidden tab. Hiding the page ends the route span so it can be exported (mobile browsers often never fire `pagehide`). Until now nothing replaced it, so every click and fetch after the user came back became its own root trace with no route attributes. Now a new `navigation` span starts when the page becomes visible again, or is restored from the back/forward cache, with `ux.route.trigger: "resume"`. It begins a new trace.

`RouteTrigger` gains the `'resume'` value. Queries that count navigations should exclude it; the bundled Grafana "Navigation Patterns" panel now does.
