# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-05-20

### Added
- Initial release of `@tindalabs/blindspot`.
- Auto-instrumentation for routing, clicks, form interactions, fetch/XHR, Web Vitals, and JS errors.
- `recordEvent(name, attributes)` for attaching semantic events to the active OTel route trace.
- `init(config)` with configurable privacy redaction rules and per-instrumentation opt-out.
- W3C TraceContext propagation (`traceparent`/`tracestate`) on outgoing fetch and XHR requests.
- Consent gate via `grantConsent()` / `revokeConsent()` — no data is collected before consent is given.
- Route span API: `setRouteSpan`, `getRouteSpan`, `getRouteContext`, `getSessionTraceparent`.
- OTLP HTTP trace export compatible with any OpenTelemetry Collector.
