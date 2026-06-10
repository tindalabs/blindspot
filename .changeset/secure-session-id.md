---
"@tindalabs/blindspot-core": patch
---

Session id generation no longer falls back to `Math.random()`. It now prefers `crypto.randomUUID`, then a `crypto.getRandomValues`-based v4 UUID, leaving only a non-random monotonic id (`bs-<ts>-<n>`) as a last resort for runtimes with no Web Crypto at all. Resolves CodeQL `js/insecure-randomness`. The session id is a UX-telemetry marker rather than a security token, but there's no reason to keep weak randomness in the SDK.
