---
layout: home

hero:
  name: Blindspot
  text: Observability without surveillance.
  tagline: Privacy-first frontend OpenTelemetry. Emit structured spans from user interactions. Correlate with your backend traces. No DOM snapshots, no PII.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/

features:
  - icon: 🔭
    title: OpenTelemetry Native
    details: Built on @opentelemetry/sdk-trace-web. Session = Trace, Route = root Span, Interaction = child Span. Natively queryable in Tempo, Jaeger, Honeycomb, or any OTel backend — no custom tooling needed.

  - icon: 🔒
    title: Privacy First
    details: All redaction runs in-browser before any data leaves the device. Input values are never captured, no DOM snapshots, configurable PII patterns, consent gating for GDPR compliance.

  - icon: 🔗
    title: Backend Correlation
    details: The W3C traceparent header is injected into every fetch call. Frontend and backend spans appear as a single trace. Zero backend changes needed.

  - icon: ⚡
    title: Framework Integrations
    details: Drop-in integrations for React (React Router v6, TanStack Router), Vue 3 (Vue Router), Next.js (App Router + Pages Router, RSC-safe), and Svelte / SvelteKit.
---

<div style="text-align:center;margin-top:3rem;opacity:0.6;font-size:0.9rem">
  Built on <a href="https://opentelemetry.io" target="_blank" rel="noopener">OpenTelemetry</a> —
  every span Blindspot emits is native OTel, queryable in any compatible backend.
</div>
