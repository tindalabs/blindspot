# Browser Compatibility

## Supported browsers

| Browser | Minimum version | Notes |
|---------|----------------|-------|
| Chrome / Chromium | 66+ | Primary target; full feature support |
| Firefox | 57+ | Tested in E2E suite (`react-firefox` Playwright project) |
| Safari | 12.1+ | Tested in CI on macOS (`react-webkit` Playwright project) |
| Edge (Chromium) | 79+ | Shares Chromium engine; identical to Chrome |

All modern evergreen browsers are supported. IE 11 is not supported.

## Feature prerequisites

The SDK relies on:

- `fetch` — available since Chrome 42, Firefox 39, Safari 10.1
- `PerformanceObserver` (Web Vitals) — Chrome 52, Firefox 57, Safari 11
- `navigator.sendBeacon` (flush on tab close) — Chrome 39, Firefox 31, Safari 11.1
- `sessionStorage` — universally supported

The minimum versions in the table above reflect the highest floor across all features.

## E2E test matrix

The Playwright suite in `e2e/` validates the full golden path (navigation, interaction, fetch + traceparent injection, error spans) against:

| Project | Browser | Platform | Spec |
|---------|---------|----------|------|
| `react` | Chrome | Linux / macOS | `react.spec.ts` |
| `vue` | Chrome | Linux / macOS | `vue.spec.ts` |
| `next` | Chrome | Linux / macOS | `next.spec.ts` |
| `react-firefox` | Firefox | Linux / macOS | `react.spec.ts` |
| `react-webkit` | WebKit (Safari) | **macOS only** | `react.spec.ts` |

Vue and Next are only run against Chrome in the E2E suite. Browser-engine divergence (if any) would manifest in the shared SDK code, which the React spec exercises fully. The full 30-test matrix (including WebKit) runs in CI on macOS runners.

### WebKit on Linux

Playwright's bundled WebKit binary on Linux cannot reach Vite dev servers — it throws an internal error before any request is made. This is a known Playwright/WebKit-Linux limitation unrelated to the SDK. The `react-webkit` project is therefore excluded on Linux via `process.platform === 'darwin'` in `e2e/playwright.config.ts`. Safari coverage is provided by macOS CI.
