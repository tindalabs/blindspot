---
'@tindalabs/blindspot': minor
'@tindalabs/blindspot-react': patch
'@tindalabs/blindspot-vue': patch
'@tindalabs/blindspot-svelte': patch
'@tindalabs/blindspot-next': patch
---

Remove `loadRouteContextAfterReload()`. Continuing a trace across page reloads was turned off earlier because the parent span, sent by a `pagehide` beacon, often never reached the backend, which left the reloaded page's trace orphaned. Since then nothing saved the context, so this function always returned `undefined`. Each page load starts a new trace, as before. If you called it, delete the call.
