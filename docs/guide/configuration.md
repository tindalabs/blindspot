# Configuration

All options are passed to the `init()` function. Every option except `serviceName`
and `endpoint` has a safe default.

## Full reference

```typescript
import { init } from '@tindalabs/blindspot'

init({
  // ── Required ─────────────────────────────────────────────────────────────
  serviceName: 'storefront',
  endpoint: 'https://otel-collector.example.com/v1/traces',

  // ── Privacy — all restrictive by default ──────────────────────────────────
  privacy: {
    maskInputs: true,                         // never capture input content
    blockSelectors: ['[data-sensitive]', '.credit-card'],
    piiPatterns: [/\b\d{16}\b/],             // strip patterns before export
    consentRequired: false,                   // buffer until grantConsent()
  },

  // ── Sampling ──────────────────────────────────────────────────────────────
  sampling: {
    rate: 1.0,                                // lower in production (e.g. 0.1)
  },

  // ── Auto-instrumentation — all enabled by default ─────────────────────────
  instrument: {
    routing: true,
    clicks: true,
    forms: true,
    fetch: true,
    vitals: true,
    errors: true,
  },
})
```

## Option reference

### Top-level

| Option | Type | Default | Description |
|---|---|---|---|
| `serviceName` | `string` | — | **Required.** Identifies your app in traces. |
| `endpoint` | `string` | — | **Required.** OTLP/HTTP collector URL (must accept JSON). |

### `privacy`

| Option | Type | Default | Description |
|---|---|---|---|
| `maskInputs` | `boolean` | `true` | Block all input `.value` from being captured. |
| `blockSelectors` | `string[]` | `[]` | CSS selectors — elements matching these emit no spans. |
| `piiPatterns` | `RegExp[]` | `[]` | Patterns stripped from all span attribute values before export. |
| `consentRequired` | `boolean` | `false` | Buffer spans in memory; export only after `grantConsent()`. |

### `sampling`

| Option | Type | Default | Description |
|---|---|---|---|
| `rate` | `number` | `1.0` | Fraction of sessions sampled (0–1). Head-based, decided at session start. |

### `instrument`

All flags default to `true`. Set any to `false` to disable that instrumentation entirely.

| Option | What it instruments |
|---|---|
| `routing` | History API + popstate navigations |
| `clicks` | All click events (rage/dead click detection included) |
| `forms` | Form `submit` events |
| `fetch` | `window.fetch` calls |
| `vitals` | LCP, CLS, INP via `web-vitals` library |
| `errors` | Unhandled exceptions and promise rejections |

## Disabling routing for framework integrations

When using `@tindalabs/blindspot-react`, `@tindalabs/blindspot-vue`, or `@tindalabs/blindspot-next`, the
framework package handles routing itself. The `init()` call within those packages
automatically sets `instrument.routing: false` — you do not need to do this manually.

## Production recommendations

```typescript
init({
  serviceName: 'storefront',
  endpoint: process.env.OTEL_ENDPOINT,
  sampling: { rate: 0.1 },          // 10% of sessions in production
  privacy: {
    consentRequired: true,           // buffer until cookie banner resolves
    piiPatterns: [
      /\b[\w.+-]+@[\w-]+\.\w{2,}\b/,  // email addresses
      /\b\d{16}\b/,                    // card numbers
    ],
  },
})
```
