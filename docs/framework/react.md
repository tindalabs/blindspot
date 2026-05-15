# React Integration

`@tindalabs/blindspot-react` provides a provider, routing components, and hooks for
React applications. It works with React Router v6 out of the box and exposes
a generic hook for TanStack Router and other routers.

## Installation

```bash
npm install @tindalabs/blindspot-react @tindalabs/blindspot
```

## Provider

Wrap your app root with `<BlindspotProvider>`. It initialises the SDK once on
mount and makes the active span available to all child components via context.

```tsx
import { BlindspotProvider } from '@tindalabs/blindspot-react'

const blindspotConfig = {
  serviceName: 'my-react-app',
  endpoint: 'http://localhost:4318/v1/traces',
  privacy: { consentRequired: false },
}

function App() {
  return (
    <BlindspotProvider config={blindspotConfig}>
      <Router>
        <YourRoutes />
      </Router>
    </BlindspotProvider>
  )
}
```

The provider is idempotent — calling `init()` more than once is safe (subsequent
calls are no-ops).

## Route tracing — React Router v6

`<BlindspotRoutes>` is a drop-in replacement for `<Routes>`. It creates a root
span on every navigation and ends the previous one.

```tsx
import { BrowserRouter, Route } from 'react-router-dom'
import { BlindspotProvider, BlindspotRoutes } from '@tindalabs/blindspot-react'

function App() {
  return (
    <BlindspotProvider config={blindspotConfig}>
      <BrowserRouter>
        <BlindspotRoutes>
          <Route path="/" element={<Home />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirm" element={<OrderConfirm />} />
        </BlindspotRoutes>
      </BrowserRouter>
    </BlindspotProvider>
  )
}
```

Or use the dedicated subpath import:

```tsx
import { BlindspotRoutes } from '@tindalabs/blindspot-react/react-router'
```

## Route tracing — TanStack Router and others

Use `useBlindspotNavigate` to open a route span manually. Call it inside your
layout component on every path change:

```tsx
import { useBlindspotNavigate } from '@tindalabs/blindspot-react'
import { useLocation } from 'your-router'

function Layout({ children }) {
  const { pathname, search } = useLocation()
  useBlindspotNavigate(pathname, search)

  return <main>{children}</main>
}
```

`useBlindspotNavigate(pathname, search?, trigger?)` creates a new route span
whenever `pathname` or `search` changes. The optional `trigger` parameter
defaults to `'user'`; pass `'initial'` for the first render.

## `useSpan` hook

Access the current route span from any component. Use it to annotate the span
with domain-specific attributes or events.

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

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  )
}
```

`useSpan()` returns `{ addEvent, setAttribute }`. Both are no-ops when no span
is active (e.g. before the first navigation).

## Full example

See [`examples/react-basic/`](https://github.com/blindspot/blindspot/tree/main/examples/react-basic)
for a working Vite + React 18 + React Router v6 demo app.

```bash
cd examples/react-basic
pnpm dev  # http://localhost:5175
```
