# @tindalabs/blindspot-vue

[![npm version](https://img.shields.io/npm/v/@tindalabs/blindspot-vue.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-vue)
[![CI](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml/badge.svg)](https://github.com/tindalabs/blindspot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![types](https://img.shields.io/npm/types/@tindalabs/blindspot-vue.svg)](https://www.npmjs.com/package/@tindalabs/blindspot-vue)

Vue 3 integration for [Blindspot](https://github.com/tindalabs/blindspot) — *observability without surveillance*. A plugin and a composable.

```bash
npm install @tindalabs/blindspot-vue @tindalabs/blindspot
```

## Usage

Install the plugin — it takes the same config as `init()`:

```ts
import { createApp } from 'vue'
import { BlindspotPlugin } from '@tindalabs/blindspot-vue'

createApp(App).use(BlindspotPlugin, {
  endpoint: '…/v1/traces',
  serviceName: 'app',
})
```

Use the composable to attach events/attributes or open custom spans:

```ts
import { useBlindspot } from '@tindalabs/blindspot-vue'

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
