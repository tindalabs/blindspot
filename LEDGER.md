# Ledger

Open work: defects, doc drift, and deferred decisions. Each entry states where, what,
why it matters, and what "closed" means. Close an entry by deleting it in the same commit
as the fix; git history keeps the record.

Severity: **high** (wrong data or privacy exposure), **medium** (misleading docs or API),
**low** (naming, polish).

---

## L4: Decision table claims wrappers the code does not use (medium)

**Where:** [`ARCHITECTURE.md`](ARCHITECTURE.md), the "Key Technical Decisions" rows for
`@opentelemetry/instrumentation-fetch` and `@opentelemetry/instrumentation-user-interaction`,
and the "(wraps OTel fetch)" label in the system diagram

Neither package is a dependency. Fetch and click instrumentation are hand-written in
`packages/web/src/instrumentations/`. The decision was reversed without a record.

**Closed when:** the table records the actual decision and its reason (likely: control
over attributes such as `ux.api.triggered_by`, the self-instrumentation guard on the OTLP
endpoint, and bundle size, but **measure and confirm** rather than assume), and the
diagram label matches.

## L5: `getSessionTraceparent()` returns the route's traceparent (low)

**Where:** [`packages/web/src/context.ts`](packages/web/src/context.ts), exported from
`@tindalabs/blindspot` and listed in `CHANGELOG.md`

It returns the traceparent of the current route span, which changes on every navigation.
The name repeats the L3 confusion. It is public API, so renaming it is a breaking change.

**Closed when:** `getRouteTraceparent()` is added, `getSessionTraceparent()` becomes a
deprecated alias with a JSDoc `@deprecated` note and a changeset, and it is removed at the
next minor release.

## L6: `ux.session.id` vs. the semconv `session.id` (low, needs a decision)

**Where:** [`packages/core/src/init.ts`](packages/core/src/init.ts)

OTel semantic conventions define `session.id` (the `session` namespace). `ROADMAP.md`
commits new UX signals to the `ux.*` namespace, but that rule targets concepts semconv
does not cover; session identity is already covered. Using a private key means generic
OTel tooling that understands `session.id` cannot group Blindspot sessions.

**Closed when:** a decision is recorded in ARCHITECTURE.md: emit `session.id` (possibly
alongside `ux.session.id` for one deprecation cycle), or keep `ux.session.id` with the
stated reason. Check the convention's current stability level before deciding.

## L7: Route templates for navigation and fetch spans (low)

**Where:** the adapters in `packages/{react,vue,svelte,next}/src/`, and
[`packages/web/src/context.ts`](packages/web/src/context.ts) (`beginRouteSpan`)

Route spans are named `navigation` and fetch spans just `{method}`, because raw paths
are high-cardinality and can carry PII. Several routers know the route *template*
(Vue `to.matched`, SvelteKit `route.id`, React Router matches), which is
low-cardinality and free of user data. Semconv allows `{method} {url.template}` for
HTTP client spans, and a `ux.route.template` attribute would let dashboards group
routes without regexes over paths.

**Closed when:** a decision is recorded on whether to add an optional `template` to
`RouteChange` (attribute only, or also in the name), and the adapters that can supply
one do, with tests. Vanilla routing and Next App Router have no template, so they keep
the plain name.

## L8: Audit ignores GHSA-587h-7wmj-h5pm (vite 5, dev server only) (low)

**Where:** `pnpm.auditConfig.ignoreGhsas` in [`package.json`](package.json)

The advisory (a `launch-editor` file-existence check bypass on Windows, reachable through
the vite dev server) has no patched vite 5.x release. vite 5 comes from `vitepress` 1.x
(the docs site), which depends on it. It never ships in a published package, and the CI
audit gate would otherwise stay red with nothing to upgrade to.

**Closed when:** the docs move to a vitepress release built on a patched vite (2.x at the
time of writing), and the ignore entry is removed in the same commit. Re-check with
`pnpm audit` after removing it.

## L9: Migrate to Changesets v3 and `changesets/action` v2 together (medium)

**Where:** [`release.yml`](.github/workflows/release.yml), `@changesets/cli` in
[`package.json`](package.json), the Dependabot ignore for `changesets/action` majors

Action v2 refuses to run with CLI v2, renames the `publish`/`title`/`commit` inputs, and
needs the token as the `github-token` input instead of `GITHUB_TOKEN` in `env`. Bumping
either alone breaks releases. The workflow only runs on push to main, so PR CI cannot
catch it. Dependabot PR #41 was closed for this reason.

**Closed when:** the CLI and action are upgraded in one PR. Before merging, check the new
input names, the `CHANGESETS_OUTPUT` requirement for custom scripts, and that Trusted
Publishing still works (a dry run of the version step on a branch). The Dependabot ignore
is removed in the same PR.

## L10: Decide the supported Next range, including Next 16 (medium, needs a decision)

**Where:** `next` peer range in [`packages/next/package.json`](packages/next/package.json),
[`examples/next-app-router`](examples/next-app-router)

Main is on the latest 15.5.x. Next 16 is a major release of a peer dependency, so
supporting it is a product decision (widen the peer range, test both, or drop 15), not a
lockfile bump. Dependabot PRs #36 and #70 were closed for this reason, and Dependabot now
ignores Next majors.

The peer range is already wider than what we test: `next: ">=13"` promises 13, 14, 16
and every later major, while the tests, the example and e2e only run on 15.

**Closed when:** the decision is recorded, the peer range reflects it, the adapter
tests and e2e run against every supported major, and the Dependabot ignore for Next
majors is removed (or kept with the reason updated) in the same PR.

## L11: TypeScript 6 (low)

**Where:** `typescript` across the workspace

A major toolchain change with new defaults and deprecations; it needs its own pass over
every `tsconfig` and the emitted declaration files. Dependabot PR #24 was closed for this
reason.

**Closed when:** the workspace builds, type-checks, and publishes identical public `.d.ts`
surfaces on TypeScript 6, or a reason to stay on 5.x is recorded here.

## L12: Migrate to OpenTelemetry JS SDK 3 (medium, blocked upstream)

**Where:** the `@opentelemetry/*` dependencies in
[`packages/core/package.json`](packages/core/package.json) and
[`packages/web/package.json`](packages/web/package.json), and the Dependabot holds on
`exporter-trace-otlp-http` (0.300+), `api` (1.10+), and the majors of `core`,
`resources`, `sdk-trace-base` and `sdk-trace-web`

The OTLP exporter 0.300+ is built on SDK 3 and requires `@opentelemetry/api` ^1.10, but
`sdk-trace-web` has no stable 3.x yet and its 2.x line rejects api 1.10. We stay on the
last SDK 2 releases until the browser SDK catches up. `sdk-trace-base` is already a
deprecated shim over the renamed `@opentelemetry/sdk-trace`.

**Why it matters:** SDK 2 will stop receiving fixes; a security patch that only lands on
SDK 3 would force an unplanned migration. Raising the api floor to 1.10 also affects
every consumer, so it needs a changeset that says so.

**Closed when:** a stable `sdk-trace-web` 3 exists, all OTel packages move to the SDK 3
line together, imports use `@opentelemetry/sdk-trace` instead of `sdk-trace-base`, the
consumer-facing api peer change is in a changeset, and all the OTel Dependabot holds are
removed in the same PR.

## L13: CLS and INP are page-level values reported on one route span (medium, needs a decision)

**Where:** [`packages/web/src/instrumentations/vitals.ts`](packages/web/src/instrumentations/vitals.ts),
`web-vitals` in [`packages/web/package.json`](packages/web/package.json)

web-vitals 5 measures CLS and INP over the whole page lifetime and reports them when the
page is hidden. `vitals.ts` attaches them to whichever route span is open at that moment,
so in a single-page app the last route visited carries the CLS and INP of every route
before it, and the earlier routes carry none. Dashboards that group vitals by route
blame the wrong page.

web-vitals 6 can report per soft navigation (`reportSoftNavs: true`), which matches the
one-trace-per-route model, but only Chromium 151+ supports it and it costs +893 B
gzipped for `onLCP`/`onCLS`/`onINP` (2204 B on 5.3.0, 3097 B on 6.x, measured by
bundling only those three). Dependabot PR #62 (web-vitals 6) is held on this decision.

**Closed when:** a decision is recorded in ARCHITECTURE.md (adopt soft-navigation
reporting on web-vitals 6, or keep page-level values and label them as such, for example
with an attribute), it is implemented with an e2e test that navigates between routes,
and #62 is merged or closed to match.

## L16: The release workflow is pinned to npm 11 (medium)

**Where:** the "Upgrade npm for Trusted Publishing" step in
[`release.yml`](.github/workflows/release.yml)

`changeset publish` runs `pnpm publish --no-git-checks`, and pnpm 9 passes the flag on to
npm. npm 11 warns that it is unknown; npm 12 rejects it with `EUNKNOWNCONFIG`, which is
how the 0.2.0 release failed when the step installed `npm@latest` and got 12.2.2. The pin
keeps releases working, but npm 11 will eventually stop receiving fixes, and Trusted
Publishing depends on the npm version.

**Closed when:** the publish path no longer hands npm a flag it rejects (likely a pnpm
upgrade, which **verify** rather than assume), a dry run with the new npm major passes
(`npm publish --dry-run` with the flags changesets uses), and the pin moves to that
major.

## L17: `react-router-dom` is imported but not declared as a peer (medium, needs a decision)

**Where:** the `./react-router` entry of [`packages/react`](packages/react/package.json)
(`src/react-router.tsx`), and [`docs/framework/react.md`](docs/framework/react.md)

`peerDependenciesMeta` marks `react-router-dom` optional, but `peerDependencies` has no
entry for it, so the meta does nothing and no version is declared. The subpath resolves
in consumers only when their package manager happens to hoist the router; strict layouts
such as Yarn PnP refuse the import. The docs promise React Router v6, while the dev
dependency, the example and e2e run 7.

**Closed when:** the supported router majors are decided (6 and 7, or 7 only) and
measured, `react-router-dom` is declared as an optional peer with that range in a
changeset, the docs state it, and every major in the range is tested, as for React (see
the React 18 job in `ci.yml`).
