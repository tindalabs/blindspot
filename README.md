# Blindspot

> Observability without surveillance — OpenTelemetry-native frontend SDK.

Blindspot emits structured OTel spans from every user interaction: route navigations,
clicks, form submissions, fetch calls, and web vitals. Spans correlate with your backend
traces via W3C `traceparent`. No DOM snapshots. No PII.

## Local dev stack — < 5 minutes to first trace

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with the Compose plugin
- [Node 18+](https://nodejs.org/) and [pnpm](https://pnpm.io/) (`corepack enable`)

### 1 — Start the observability stack

```bash
docker compose up -d
```

This starts three services:

| Service | Port | Purpose |
|---|---|---|
| OTel Collector | `localhost:4318` | Receives OTLP/HTTP spans from the browser |
| Grafana Tempo | — (internal) | Stores traces |
| Grafana | `localhost:3100` | Visualises traces |

### 2 — Build the SDK and start the example app

```bash
pnpm install
pnpm build                               # builds @tindalabs/blindspot-core and @tindalabs/blindspot
pnpm --filter @tindalabs/blindspot-example-basic dev
```

The example app opens at **http://localhost:5174**.

### 3 — See your traces

1. Open **http://localhost:3100** (login: `admin` / `admin`)
2. Navigate to **Dashboards → Blindspot — Overview**
3. Click around in the example app — traces appear within a few seconds

### 4 — Stop

```bash
docker compose down
```

## Packages

| Package | Description |
|---|---|
| [`@tindalabs/blindspot-core`](packages/core) | OTel provider, privacy engine, consent gate |
| [`@tindalabs/blindspot`](packages/web) | Auto-instrumentation (routing, clicks, forms, fetch, vitals, errors) |
| [`@tindalabs/blindspot-react`](packages/react) | React integration — `BlindspotProvider`, `BlindspotRoutes`, `useSpan` |
| [`@tindalabs/blindspot-vue`](packages/vue) | Vue 3 integration — `BlindspotPlugin`, `useBlindspot` |
| [`@tindalabs/blindspot-svelte`](packages/svelte) | Svelte / SvelteKit integration |
| [`@tindalabs/blindspot-next`](packages/next) | Next.js integration — App Router + Pages Router |

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system diagram, span taxonomy,
and privacy model.

## API Reference

See [SDK_API.md](SDK_API.md) for the complete public API.

## The Tindalabs stack

Blindspot is one of three composable browser-layer packages:

| Package | What it does |
|---|---|
| **[@tindalabs/blindspot](https://github.com/tindalabs/blindspot)** | Privacy-first OTel frontend observability |
| **[@tindalabs/shield](https://github.com/tindalabs/shield)** | Tamper detection & active content protection |
| **[@tindalabs/scent](https://github.com/tindalabs/scent)** | Probabilistic identity continuity |

They compose naturally: Shield attaches `shield.*` attributes to Blindspot spans, and Scent reads those same attributes as risk signals via `observe({ extraSignals: shield.signals })`.

## Roadmap

See [ROADMAP.md](ROADMAP.md) — React, Vue, and Next.js integrations are next.

## License

MIT
