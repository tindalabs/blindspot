# @tindalabs/blindspot-next

[![npm version](https://img.shields.io/npm/v/@tindalabs/blindspot-next.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-next)
[![CI](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml/badge.svg)](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![types](https://img.shields.io/npm/types/@tindalabs/blindspot-next.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-next)

Next.js integration for [Blindspot](https://github.com/tindalabs/blindspot) — *observability without surveillance*. Supports both the **App Router** and the **Pages Router**.

```bash
npm install @tindalabs/blindspot-next @tindalabs/blindspot
```

Requires Next.js ≥13 and React ≥18.

## App Router

`BlindspotProvider` is a client component; mount it in your root layout with the matching route tracker:

```tsx
// app/layout.tsx
import { BlindspotProvider, BlindspotAppRouter } from '@tindalabs/blindspot-next'

export default function RootLayout({ children }) {
  return (
    <html><body>
      <BlindspotProvider config={{ endpoint: '…/v1/traces', serviceName: 'app' }}>
        <BlindspotAppRouter />
        {children}
      </BlindspotProvider>
    </body></html>
  )
}
```

## Pages Router

```tsx
// pages/_app.tsx
import { BlindspotProvider, BlindspotPagesRouter } from '@tindalabs/blindspot-next'

export default function App({ Component, pageProps }) {
  return (
    <BlindspotProvider config={{ endpoint: '…/v1/traces', serviceName: 'app' }}>
      <BlindspotPagesRouter />
      <Component {...pageProps} />
    </BlindspotProvider>
  )
}
```

The router components emit a root span on each navigation; `BlindspotProvider` takes the same config as `init()`.

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
