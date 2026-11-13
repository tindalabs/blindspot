---
"@tindalabs/blindspot-core": patch
"@tindalabs/blindspot": patch
---

Update the OpenTelemetry SDK to 2.12 (exporter 0.223), which pulls `@opentelemetry/core` 2.12.1 and resolves GHSA-8988-4f7v-96qf. `@opentelemetry/api` stays at `^1.9.1`, so no consumer-facing peer changes.
