---
"@tindalabs/blindspot-core": patch
---

Apply `privacy.piiPatterns` and `privacy.scrubAttributes` to span event attributes, not only span attributes. Previously, exception messages and stack traces recorded via `recordException` (including failed `fetch` calls) and attributes passed to `recordEvent` were exported unredacted.

Also fix `piiPatterns` entries with the `/g` flag: they redacted only every other matching value because `RegExp#test` kept `lastIndex` between calls.
