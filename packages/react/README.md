# @tindalabs/blindspot-react

[![npm version](https://img.shields.io/npm/v/@tindalabs/blindspot-react.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-react)
[![CI](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml/badge.svg)](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![types](https://img.shields.io/npm/types/@tindalabs/blindspot-react.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-react)

React integration for [Blindspot](https://github.com/tindalabs/blindspot) — *observability without surveillance*. Provider, React Router v6/7 route tracing, and a hook for the active span.

```bash
npm install @tindalabs/blindspot-react @tindalabs/blindspot
```

Requires React ≥18. `react-router-dom` is an optional peer (only for `<BlindspotRoutes>`).

## Usage

Wrap your app root — `BlindspotProvider` takes the same config as `init()`:

```tsx
import { BlindspotProvider } from '@tindalabs/blindspot-react'

<BlindspotProvider config={{ endpoint: '…/v1/traces', serviceName: 'app' }}>
  <App />
</BlindspotProvider>
```

Trace navigations with a drop-in replacement for `<Routes>` (creates a root span per navigation):

```tsx
import { BlindspotRoutes } from '@tindalabs/blindspot-react'

<BlindspotRoutes>
  <Route path="/checkout" element={<Checkout />} />
</BlindspotRoutes>
```

Attach events/attributes to the active span from any component:

```tsx
import { useSpan } from '@tindalabs/blindspot-react'

const { addEvent, setAttribute } = useSpan()
addEvent('form.validation.failed', { field: 'postcode' })
```

## Docs

[API reference](https://github.com/tindalabs/blindspot/blob/main/SDK_API.md) · [Architecture & privacy model](https://github.com/tindalabs/blindspot/blob/main/ARCHITECTURE.md)

## The Tindalabs stack

| Package | What it does |
|---|---|
| **[@tindalabs/blindspot](https://github.com/tindalabs/blindspot)** | Privacy-first OTel frontend observability |
| **[@tindalabs/shield](https://github.com/tindalabs/shield)** | Tamper detection & content protection |
| **[@tindalabs/scent](https://github.com/tindalabs/scent)** | Probabilistic identity continuity |

## License

MIT
