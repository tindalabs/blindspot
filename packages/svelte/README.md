# @tindalabs/blindspot-svelte

[![npm version](https://img.shields.io/npm/v/@tindalabs/blindspot-svelte.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-svelte)
[![CI](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml/badge.svg)](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![types](https://img.shields.io/npm/types/@tindalabs/blindspot-svelte.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-svelte)

Svelte / SvelteKit integration for [Blindspot](https://github.com/tindalabs/blindspot) — *observability without surveillance*.

```bash
npm install @tindalabs/blindspot-svelte @tindalabs/blindspot
```

## Usage

Initialize once in your root layout — `initBlindspot` takes the same config as `init()`:

```ts
// +layout.svelte (or +layout.ts)
import { initBlindspot } from '@tindalabs/blindspot-svelte'

initBlindspot({ endpoint: '…/v1/traces', serviceName: 'app' })
```

For SvelteKit, wire route tracing to the navigation lifecycle:

```ts
import { beforeNavigate, afterNavigate } from '$app/navigation'
import { installBlindspotRouter } from '@tindalabs/blindspot-svelte'

installBlindspotRouter({ beforeNavigate, afterNavigate })
```

Attach events/attributes or open custom spans from any component:

```ts
import { useBlindspot } from '@tindalabs/blindspot-svelte'

const { addEvent, setAttribute, startSpan } = useBlindspot()
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
