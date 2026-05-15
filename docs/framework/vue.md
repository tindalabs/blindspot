# Vue Integration

`@tindalabs/blindspot-vue` provides a Vue 3 plugin and a composable for Vue applications.
It integrates with Vue Router 4 via navigation guards.

## Installation

```bash
npm install @tindalabs/blindspot-vue @tindalabs/blindspot
```

## Plugin

Install `BlindspotPlugin` in your app entry file. Pass the SDK config and,
optionally, your router instance.

```typescript
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { BlindspotPlugin } from '@tindalabs/blindspot-vue'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/tasks', component: Tasks },
    { path: '/about', component: About },
  ],
})

const blindspotConfig = {
  serviceName: 'my-vue-app',
  endpoint: 'http://localhost:4318/v1/traces',
  privacy: { consentRequired: false },
}

createApp(App)
  .use(router)
  .use(BlindspotPlugin, { config: blindspotConfig, router })
  .mount('#app')
```

When `router` is provided, Blindspot installs `beforeEach` and `afterEach`
navigation guards automatically. Each route transition creates a root span.
Omit `router` if you want to manage routing instrumentation manually.

## `useBlindspot` composable

Access span operations from any component or composable:

```typescript
import { useBlindspot } from '@tindalabs/blindspot-vue'

const { addEvent, setAttribute, startSpan } = useBlindspot()
```

### `addEvent(name, attributes?)`

Add a named event to the current route span:

```typescript
const { addEvent } = useBlindspot()

function onValidationError(field: string) {
  addEvent('form.validation.failed', { field })
}
```

### `setAttribute(key, value)`

Set an attribute on the current route span:

```typescript
const { setAttribute } = useBlindspot()

function onStepComplete(step: number) {
  setAttribute('ux.checkout.step', step)
}
```

### `startSpan(name, fn)`

Create a child span scoped to a callback. The span is always ended, even if `fn`
throws.

```typescript
const { startSpan } = useBlindspot()

async function handlePayment() {
  startSpan('payment.validate', () => {
    // run validation — span ends when this returns
  })
}
```

## Session continuity on page reload

When the user hard-reloads a page, Blindspot rehydrates the previous session
context from `sessionStorage` so the new page load stays within the same trace.
This happens automatically via the `router` integration — no configuration needed.

## Full example

See [`examples/vue-basic/`](https://github.com/blindspot/blindspot/tree/main/examples/vue-basic)
for a working Vite + Vue 3 + Vue Router 4 demo app.

```bash
cd examples/vue-basic
pnpm dev  # http://localhost:5176
```
