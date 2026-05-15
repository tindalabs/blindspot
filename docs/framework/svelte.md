# Svelte / SvelteKit Integration

`@tindalabs/blindspot-svelte` provides an `initBlindspot` function, a SvelteKit router
integration, and a `useBlindspot` composable. All functions include an SSR
guard — they are no-ops when `window` is undefined, so they are safe to call
in SvelteKit server-side contexts.

## Installation

```bash
npm install @tindalabs/blindspot-svelte @tindalabs/blindspot
```

## SvelteKit setup

Add a root layout that initialises the SDK and wires up route tracing.
Use SvelteKit's `beforeNavigate` / `afterNavigate` lifecycle hooks from
`$app/navigation` — this avoids importing virtual modules inside the library.

**`src/routes/+layout.svelte`**

```svelte
<script>
  import { browser } from '$app/environment';
  import { beforeNavigate, afterNavigate } from '$app/navigation';
  import { initBlindspot, installBlindspotRouter } from '@tindalabs/blindspot-svelte';

  if (browser) {
    initBlindspot({
      serviceName: 'my-sveltekit-app',
      endpoint: 'http://localhost:4318/v1/traces',
    });

    installBlindspotRouter({ beforeNavigate, afterNavigate });
  }
</script>

<slot />
```

The `if (browser)` guard (or `onMount`) ensures that `initBlindspot` and
`installBlindspotRouter` only run on the client. Both functions also contain
their own internal SSR guard as a safety net.

## Plain Svelte (no SvelteKit)

Call `initBlindspot` once in your app's root component:

```svelte
<script>
  import { onMount } from 'svelte';
  import { initBlindspot } from '@tindalabs/blindspot-svelte';

  onMount(() => {
    initBlindspot({
      serviceName: 'my-svelte-app',
      endpoint: 'http://localhost:4318/v1/traces',
    });
  });
</script>
```

Route instrumentation without SvelteKit requires calling
`installBlindspotRouter` with equivalent `beforeNavigate` / `afterNavigate`
hooks from your router of choice, or using the `@tindalabs/blindspot` tracer API
directly to manage route spans manually.

## `useBlindspot` composable

Access span operations from any component:

```svelte
<script>
  import { useBlindspot } from '@tindalabs/blindspot-svelte';

  const { addEvent, setAttribute, startSpan } = useBlindspot();
</script>
```

### `addEvent(name, attributes?)`

Add a named event to the current route span:

```svelte
<script>
  import { useBlindspot } from '@tindalabs/blindspot-svelte';
  const { addEvent } = useBlindspot();

  function onFilterChange(value: string) {
    addEvent('filter.applied', { filter: value });
  }
</script>
```

### `setAttribute(key, value)`

Set an attribute on the current route span:

```svelte
<script>
  import { useBlindspot } from '@tindalabs/blindspot-svelte';
  const { setAttribute } = useBlindspot();

  function onPlanSelected(plan: string) {
    setAttribute('ux.plan.selected', plan);
  }
</script>
```

### `startSpan(name, fn)`

Create a child span scoped to a synchronous callback. The span always ends,
even if `fn` throws.

```svelte
<script>
  import { useBlindspot } from '@tindalabs/blindspot-svelte';
  const { startSpan } = useBlindspot();

  function validateForm() {
    startSpan('form.validate', () => {
      // synchronous validation — span ends when this returns
    });
  }
</script>
```

## Configuration reference

`initBlindspot` accepts the same config object as `init` from `@tindalabs/blindspot`.
See [Configuration](/guide/configuration) for all options.

## Session continuity on page reload

When the user hard-reloads a page, Blindspot rehydrates the previous session
context from `sessionStorage` so the new page load stays within the same trace.
This happens automatically via `installBlindspotRouter` — no configuration
needed.

## Privacy

Click spans on inputs whose label matches a PII keyword (password, email, card
number, etc.) are automatically suppressed. Use `data-blindspot-block` to block
an element entirely, or `data-blindspot-label` to provide a safe label. See the
[Privacy Model](/guide/privacy) guide for full details.
