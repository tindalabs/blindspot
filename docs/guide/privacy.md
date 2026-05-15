# Privacy Model

Blindspot is designed around a single constraint: **no user content ever leaves
the browser**. Privacy is enforced at the collection layer, not filtered downstream.

## What is captured

Blindspot captures **behavioural metadata** — the shape of user interactions,
not their content.

| Signal | Captured attributes |
|---|---|
| Route changes | Path before and after, navigation trigger (user / popstate / initial) |
| Clicks | Element tag, ARIA role, label, whether interactive, rage/dead click flags |
| Form submits | Form name, browser validation state, attempt count |
| Fetch calls | HTTP method, URL path, status code, user-perceived latency |
| Web Vitals | LCP, CLS, INP values |
| Errors | Exception constructor name, sanitized message (paths/queries stripped) |

## What is never captured

- **Input values** — `.value` is never read on any form field, ever
- **DOM content** — no text content, no DOM snapshots, no screenshots
- **Query strings** — stripped from URLs and error stack traces before export
- **File paths** — stripped from error stack traces
- **PII patterns** — configurable regex list applied to all attribute values

## Privacy layers

### 1. Input masking (always on)

Even with `maskInputs: false`, Blindspot only captures `[type]`, `[name]`, and
`[aria-label]` from input elements. The `.value` property is never accessed. This
is enforced in the instrumentation code, not the privacy config.

### 2. Selector blocking

Mark elements that should emit no spans at all:

```html
<!-- HTML annotation -->
<div data-blindspot-block>
  <input type="password" />
</div>
```

```typescript
// Or via config
init({
  privacy: {
    blockSelectors: ['[data-sensitive]', '.pii-container', '#card-form'],
  },
})
```

Blocked elements produce no spans, events, or attributes.

### 3. PII redaction

Apply regex patterns to scrub values from all span attributes before export:

```typescript
init({
  privacy: {
    piiPatterns: [
      /\b[\w.+-]+@[\w-]+\.\w{2,}\b/,  // email addresses
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,  // card numbers
      /\b\d{9,11}\b/,                  // phone numbers (rough)
    ],
  },
})
```

Redaction runs in-browser before the OTLP exporter sends any data.

### 4. Consent gating (GDPR)

Buffer all spans in memory until the user explicitly consents:

```typescript
init({
  privacy: { consentRequired: true },
})

// In your cookie banner callback:
import { grantConsent, revokeConsent } from '@tindalabs/blindspot'

if (userAccepted) {
  grantConsent()   // flushes the buffer, enables ongoing export
} else {
  revokeConsent()  // drops the buffer, export remains disabled
}
```

While buffered, no data is sent. If the user never interacts with the consent
banner, the buffer is eventually garbage collected when the tab closes.

## Automatic dynamic-segment scrubbing

Labels derived automatically from the DOM (via `aria-label`, `aria-labelledby`,
or element text content) are passed through a scrubber before being used in span
names or attributes. The scrubber strips tokens that are likely auto-generated:

| Pattern | Example | What it removes |
|---|---|---|
| UUIDs | `123e4567-e89b-12d3-a456-…` | Full UUID string |
| Styled Components | `sc-dkPtRN`, `sc-bdfxAY` | CSS-in-JS class hash |
| Emotion | `css-1x3j7`, `css-abcDEF` | CSS-in-JS class hash |
| Long lowercase hex | `deadbeefcafe1234` | Content/build hashes |
| Long numeric IDs | `item-123456`, `row-99999` | Database/timestamp IDs |

Explicit `data-blindspot-label` values are **never** scrubbed — they are
developer-controlled and intentional.

```html
<!-- Without annotation — auto-derived label from aria-label is scrubbed -->
<div aria-label="tooltip-abc123def456">…</div>
<!-- span label would be "tooltip-" after removing the hash -->

<!-- With annotation — exact value is used, no scrubbing -->
<div data-blindspot-label="help-tooltip">…</div>
```

## Label-aware PII detection

Blindspot automatically treats inputs as sensitive when their associated
`<label>` text matches a known PII keyword — no configuration required.

Sensitive keywords detected (case-insensitive):

- **Credentials**: password, passcode, pin
- **Contact**: email, phone, mobile, tel
- **Location**: address, postcode, zip, postal
- **Identity**: SSN, social security, national ID, NIF, DNI, tax ID
- **Payment**: card number, CVV, CVC, expiry
- **Personal**: date of birth, full name, first name, last name

Any click on an element whose label matches is silently dropped — no span
created, no attribute captured. This covers three label sources:

```html
<!-- via <label for="…"> -->
<label for="card">Card number</label>
<input id="card" type="text" />

<!-- via wrapping <label> -->
<label>
  Date of birth
  <input type="date" />
</label>

<!-- via aria-label -->
<input aria-label="Enter your email address" />
```

All three cases are detected and suppressed automatically.

## Label annotation

Blindspot uses element labels for span names rather than DOM text content (which
may contain PII). Use `data-blindspot-label` to set an explicit, safe label:

```html
<!-- Without annotation — span name would be "click button[Place Order — $49.99]" -->
<button>Place Order — $49.99</button>

<!-- With annotation — span name is "click button[submit-order]" -->
<button data-blindspot-label="submit-order">Place Order — $49.99</button>
```

This is especially useful for buttons and links whose visible text changes by
locale or user context.

## In-browser redaction guarantee

All privacy processing happens synchronously inside the browser before the OTLP
batch exporter sends data. The export pipeline is:

```
Interaction
  → Span created with raw attributes
  → Privacy engine scrubs piiPatterns from attribute values
  → Selector/input blocking checked — span dropped if matched
  → Consent gate checked — span buffered if consentRequired=true
  → BatchSpanProcessor queues span
  → OTLP/HTTP exporter sends batch to collector
```

The collector never sees unredacted data.
