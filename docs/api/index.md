# API Reference

## `@tindalabs/blindspot`

The main auto-instrumentation package. All other packages re-export `init()`.

### `init(config)`

Initialise the SDK. Should be called once, as early as possible. Idempotent —
subsequent calls are no-ops.

```typescript
import { init } from '@tindalabs/blindspot'

init({
  serviceName: 'my-app',
  endpoint: 'https://otel-collector.example.com/v1/traces',
})
```

See [Configuration](/guide/configuration) for the full options reference.

---

### `tracer`

The underlying OTel `Tracer` instance. Use for manual span creation.

```typescript
import { tracer } from '@tindalabs/blindspot'

const span = tracer.startSpan('checkout.address-step')
span.setAttribute('ux.form.fields_count', 5)
// ... user interaction ...
span.end()
```

---

### `recordEvent(name, attributes?)`

Fire a named event on the current active route span without managing span
lifecycle manually.

```typescript
import { recordEvent } from '@tindalabs/blindspot'

recordEvent('promo.applied', { code_type: 'percentage' })
recordEvent('payment.method.selected', { method: 'card' })
recordEvent('form.validation.failed', { field: 'postcode', reason: 'format' })
```

No-op if no route span is currently active.

---

### `grantConsent()`

Flush the buffered span queue and enable ongoing export. Only meaningful when
`privacy.consentRequired: true`.

```typescript
import { grantConsent } from '@tindalabs/blindspot'

grantConsent()
```

---

### `revokeConsent()`

Drop the buffered span queue and disable export. Only meaningful when
`privacy.consentRequired: true`.

```typescript
import { revokeConsent } from '@tindalabs/blindspot'

revokeConsent()
```

---

### `scrubDynamicSegments(value)`

Strip auto-generated tokens (UUIDs, CSS-in-JS class hashes, long hex strings,
long numeric IDs) from a string. Applied automatically inside `getElementLabel`
for all derived labels. Available for advanced use cases.

```typescript
import { scrubDynamicSegments } from '@tindalabs/blindspot-core'

scrubDynamicSegments('tooltip-123e4567-e89b-12d3-a456-426614174000')
// → 'tooltip-'

scrubDynamicSegments('sc-dkPtRN button')
// → 'button'
```

---

### `isLabelSensitive(element)`

Returns `true` if the element's associated label (via `<label for>`, wrapping
`<label>`, or `aria-label`) matches a PII keyword pattern. Used internally to
suppress click spans on sensitive inputs. Available for custom instrumentation.

```typescript
import { isLabelSensitive } from '@tindalabs/blindspot-core'

const input = document.querySelector('#card-number')!
if (isLabelSensitive(input)) {
  // treat as blocked
}
```

---

## Auto-instrumentation span reference

Spans emitted automatically when their instrumentation is enabled.

| Instrumentation | Span name pattern | Key attributes |
|---|---|---|
| `routing` | `navigation {from} → {to}` | `ux.route.from`, `ux.route.to`, `ux.route.trigger` |
| `clicks` | `click {tag}[{label}]` | `ux.interaction.type`, `ux.element.label`, `ux.element.tag`, `ux.element.role`, `ux.rage_click`, `ux.dead_click` |
| `forms` | `form.submit {name}` | `ux.form.name`, `ux.form.valid`, `ux.form.attempts` |
| `fetch` | `{METHOD} {path}` | `http.request.method`, `url.full`, `http.response.status_code`, `ux.api.user_wait_ms`, `ux.api.triggered_by` |
| `vitals` | Events on route span | `lcp`, `cls`, `inp` (as span events with `web_vital.value`) |
| `errors` | `error.unhandled` | `exception` event → `exception.type`, `exception.message` (sanitized) |

---

## `@tindalabs/blindspot-react`

### `<BlindspotProvider config={…}>`

Initialises the SDK and provides span context to child components. Idempotent.

### `<BlindspotRoutes>`

Drop-in for React Router v6 `<Routes>`. Creates a root span on every navigation.

### `useBlindspotNavigate(pathname, search?, trigger?)`

Generic hook for non-React-Router routers (TanStack Router, etc.). Opens a new
route span whenever `pathname` or `search` changes.

### `useSpan()`

Returns `{ addEvent, setAttribute }` for the current route span.

---

## `@tindalabs/blindspot-vue`

### `BlindspotPlugin`

Vue 3 plugin. Accepts `{ config, router? }` as options.

```typescript
app.use(BlindspotPlugin, { config: blindspotConfig, router })
```

### `installBlindspotRouter(router)`

Installs Vue Router navigation guards manually if you prefer not to pass
`router` to the plugin.

```typescript
import { installBlindspotRouter } from '@tindalabs/blindspot-vue'
installBlindspotRouter(router)
```

### `useBlindspot()`

Returns `{ addEvent, setAttribute, startSpan }`.

| Method | Description |
|---|---|
| `addEvent(name, attrs?)` | Add event to current route span |
| `setAttribute(key, value)` | Set attribute on current route span |
| `startSpan(name, fn)` | Run `fn` inside a child span; span always ends |

---

## `@tindalabs/blindspot-next`

### `<BlindspotProvider config={…}>`

Client Component for Next.js App Router. Initialises SDK and renders
`<BlindspotAppRouter>` internally.

### `<BlindspotAppRouter>`

Standalone App Router route-tracing component. Wrapped in `<Suspense>` by
`BlindspotProvider` automatically.

### `<BlindspotPagesRouter>`

Route-tracing component for Next.js Pages Router. Add once to `_app.tsx`.

---

## `@tindalabs/blindspot-svelte`

### `initBlindspot(config)`

Initialises the SDK. Disables built-in routing instrumentation so SvelteKit's
navigation hooks can take over. SSR-safe — no-op when `window` is undefined.

```typescript
import { initBlindspot } from '@tindalabs/blindspot-svelte'

initBlindspot({
  serviceName: 'my-sveltekit-app',
  endpoint: 'http://localhost:4318/v1/traces',
})
```

### `installBlindspotRouter({ beforeNavigate, afterNavigate })`

Installs route tracing using SvelteKit's navigation hooks. Pass the functions
imported from `$app/navigation` directly — the library does not import them
internally. SSR-safe — no-op when `window` is undefined.

```svelte
<script>
  import { beforeNavigate, afterNavigate } from '$app/navigation'
  import { installBlindspotRouter } from '@tindalabs/blindspot-svelte'

  installBlindspotRouter({ beforeNavigate, afterNavigate })
</script>
```

### `useBlindspot()`

Returns `{ addEvent, setAttribute, startSpan }`. Same interface as the Vue
composable.

| Method | Description |
|---|---|
| `addEvent(name, attrs?)` | Add event to current route span |
| `setAttribute(key, value)` | Set attribute on current route span |
| `startSpan(name, fn)` | Run `fn` inside a child span; span always ends |

---

## HTML annotations

No JavaScript required for these.

| Attribute | Effect |
|---|---|
| `data-blindspot-block` | Element and all descendants emit no spans |
| `data-blindspot-label="…"` | Override the label used in span names (avoids leaking DOM text) |

```html
<!-- Block entirely -->
<div data-blindspot-block>
  <input type="password" />
</div>

<!-- Safe label -->
<button data-blindspot-label="submit-order">
  Place Order — $49.99
</button>
```
