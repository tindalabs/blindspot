# Blindspot — SDK API Reference

> Observability without surveillance.

---

## Installation

```bash
# Core bundle (most users)
npm install @tindalabs/blindspot

# Framework integrations (pick one)
npm install @tindalabs/blindspot-react
npm install @tindalabs/blindspot-vue
npm install @tindalabs/blindspot-next
```

---

## Initialization

```typescript
import { init } from '@tindalabs/blindspot'

init({
  // Required
  endpoint: 'https://otel-collector.example.com/v1/traces',
  serviceName: 'storefront',

  // Privacy — all restrictive by default
  privacy: {
    maskInputs: true,                        // never capture input content (default: true)
    blockSelectors: ['[data-sensitive]', '.credit-card'],
    piiPatterns: [/\b\d{16}\b/],            // strip card numbers, etc.
    consentRequired: false,                  // set true to buffer until consent is granted
  },

  // Sampling
  sampling: { rate: 1.0 },                  // lower in production (e.g. 0.2)

  // Auto-instrumentation — all enabled by default
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

### Configuration reference

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | — | OTLP/HTTP collector URL |
| `serviceName` | `string` | — | Identifies your app in traces |
| `privacy.maskInputs` | `boolean` | `true` | Block all input content from being captured |
| `privacy.blockSelectors` | `string[]` | `[]` | CSS selectors for elements to exclude entirely |
| `privacy.piiPatterns` | `RegExp[]` | `[]` | Patterns stripped from all attribute values |
| `privacy.consentRequired` | `boolean` | `false` | Buffer spans until `grantConsent()` is called |
| `sampling.rate` | `number` | `1.0` | Fraction of sessions to export (0–1) |
| `instrument.*` | `boolean` | `true` | Toggle individual auto-instrumentations |

---

## Manual Instrumentation

### Custom spans

Wrap meaningful user flows with a span to measure duration and attach context.

```typescript
import { tracer, recordEvent } from '@tindalabs/blindspot'

const span = tracer.startSpan('checkout.address-validation')
span.setAttribute('ux.form.fields_count', 5)

// ... user fills out form ...

span.setAttribute('ux.form.attempts', 2)
span.end()
```

### Semantic events

Fire events onto the current active span without managing span lifecycle.

```typescript
import { recordEvent } from '@tindalabs/blindspot'

// Good: describes behaviour, no PII
recordEvent('promo.applied', { code_type: 'percentage' })
recordEvent('payment.method.selected', { method: 'card' })
recordEvent('form.validation.failed', { field: 'postcode', reason: 'format' })
```

---

## Consent Management (GDPR)

When `privacy.consentRequired: true`, all spans are buffered in memory and
nothing is exported until consent is explicitly granted.

```typescript
import { grantConsent, revokeConsent } from '@tindalabs/blindspot'

// Call after your CMP resolves
if (userAccepted) {
  grantConsent()    // flushes the buffer, enables ongoing export
} else {
  revokeConsent()   // drops the buffer, export stays disabled
}
```

---

## React Integration (`@tindalabs/blindspot-react`)

### Provider

Wrap your app root. Accepts the same config object as `init()`.

```tsx
import { BlindspotProvider } from '@tindalabs/blindspot-react'

<BlindspotProvider config={blindspotConfig}>
  <App />
</BlindspotProvider>
```

### Route tracing (React Router v6)

Drop-in replacement for `<Routes>` that creates a root span on every navigation.

```tsx
import { BlindspotRoutes } from '@tindalabs/blindspot-react'

<BlindspotRoutes>
  <Route path="/checkout" element={<Checkout />} />
  <Route path="/order-confirm" element={<OrderConfirm />} />
</BlindspotRoutes>
```

### `useSpan` hook

Access the current active span from any component.

```tsx
import { useSpan } from '@tindalabs/blindspot-react'

function CheckoutForm() {
  const { addEvent, setAttribute } = useSpan()

  const handleValidationError = (field: string) => {
    addEvent('form.validation.failed', { field })
  }

  const handleStepComplete = (step: number) => {
    setAttribute('ux.checkout.step', step)
  }
}
```

---

## Vue Integration (`@tindalabs/blindspot-vue`)

### Plugin

```typescript
import { BlindspotPlugin } from '@tindalabs/blindspot-vue'

app.use(BlindspotPlugin, blindspotConfig)
```

### `useBlindspot` composable

```typescript
import { useBlindspot } from '@tindalabs/blindspot-vue'

const { addEvent, setAttribute, startSpan } = useBlindspot()

function onValidationError(field: string) {
  addEvent('form.validation.failed', { field })
}
```

---

## Privacy Annotation (HTML)

Mark elements directly in your markup without touching JS config.

```html
<!-- Block this element entirely — no events captured from it -->
<div data-blindspot-block>
  <input type="password" />
</div>

<!-- Override label used in span name (avoids leaking DOM text) -->
<button data-blindspot-label="submit-order">
  Place Order — $49.99
</button>
```

---

## Auto-Instrumentation Reference

Spans emitted automatically when their instrumentation is enabled.

| Instrumentation | Span name pattern | Key attributes |
|---|---|---|
| `routing` | `navigation {from} → {to}` | `ux.route.from`, `ux.route.to`, `ux.route.trigger` |
| `clicks` | `click {tag}[{label}]` | `ux.interaction.type`, `ux.element.label`, `ux.rage_click`, `ux.dead_click` |
| `forms` | `form.submit {name}` | `ux.form.name`, `ux.form.valid`, `ux.form.attempts` |
| `fetch` | `{METHOD} {path}` | `http.method`, `http.url`, `http.status_code`, `ux.api.user_wait_ms` |
| `vitals` | Events on route span | `lcp`, `cls`, `inp` values as span events |
| `errors` | `error.unhandled` | `error.type`, `error.message`, `error.stack` (sanitized) |
