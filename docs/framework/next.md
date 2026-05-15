# Next.js Integration

`@tindalabs/blindspot-next` handles the edge cases specific to Next.js: SSR safety (SDK
only initialises on the client), RSC safety (server components import a no-op
stub), and support for both App Router and Pages Router.

## Installation

```bash
npm install @tindalabs/blindspot-next @tindalabs/blindspot
```

## App Router

### Provider

Add `<BlindspotProvider>` to your root layout. It is a Client Component that
initialises the SDK and renders the route-tracing component automatically.

```tsx
// app/layout.tsx
import { BlindspotProvider } from '@tindalabs/blindspot-next'

const blindspotConfig = {
  serviceName: 'my-next-app',
  endpoint: '/v1/traces',    // proxied through Next.js rewrites → collector
  privacy: { consentRequired: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BlindspotProvider config={blindspotConfig}>
          {children}
        </BlindspotProvider>
      </body>
    </html>
  )
}
```

The provider renders `<BlindspotAppRouter>` inside a `<Suspense>` boundary
internally. This is required because `useSearchParams()` (used to track query
string changes) would otherwise opt all pages out of static rendering.

### Proxying the OTLP endpoint

It is good practice to proxy the OTLP endpoint through your Next.js app rather
than exposing the collector directly to the browser. Add a rewrite to
`next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/v1/traces',
        destination: 'http://otel-collector:4318/v1/traces',
      },
    ]
  },
}

module.exports = nextConfig
```

Then set `endpoint: '/v1/traces'` in the config (relative path, no CORS needed).

## Pages Router

Use `<BlindspotPagesRouter>` instead. Add it to your `_app.tsx`:

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app'
import { BlindspotPagesRouter } from '@tindalabs/blindspot-next'
import { useEffect, useRef } from 'react'
import { init } from '@tindalabs/blindspot'

export default function MyApp({ Component, pageProps }: AppProps) {
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    init({
      serviceName: 'my-next-app',
      endpoint: '/v1/traces',
      instrument: { routing: false },
    })
  }, [])

  return (
    <>
      <BlindspotPagesRouter />
      <Component {...pageProps} />
    </>
  )
}
```

`<BlindspotPagesRouter>` hooks into `router.events` (`routeChangeStart` /
`routeChangeComplete`) and manages route span lifecycle for you.

## RSC safety

All exports from `@tindalabs/blindspot-next` are Client Components (they use hooks and
browser APIs). The package bundle includes a `'use client'` directive at the
top, so importing from a Server Component is safe — Next.js will automatically
split the client part into a separate bundle.

```tsx
// This is fine in a Server Component:
import { BlindspotProvider } from '@tindalabs/blindspot-next'
```

## Session continuity on page reload

Hard navigations (full page loads, SSR transitions in Pages Router) are handled
automatically. The active trace context is serialized to `sessionStorage` before
the page unloads and rehydrated on the next load, keeping the user's session
within the same trace.

## Full example

See [`examples/next-app-router/`](https://github.com/blindspot/blindspot/tree/main/examples/next-app-router)
for a working Next.js 14 App Router demo app.

```bash
cd examples/next-app-router
pnpm dev  # http://localhost:3001
```
