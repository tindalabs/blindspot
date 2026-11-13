# Grafana Dashboard

Blindspot ships a pre-built Grafana dashboard that covers all the UX signals
the SDK emits — auto-provisioned when you run `docker compose up`.

## Accessing the dashboard

1. Start the local stack: `docker compose up -d`
2. Open Grafana at `http://localhost:3100`
3. Navigate to **Dashboards → Blindspot — Overview**

No login required in local dev mode (anonymous access enabled).

## Dashboard panels

The dashboard is organized into four collapsible row sections.

### User Sessions

**Recent Routes**: every route in the selected time range. Each route is its own
trace, so each row is one route (its navigation span). Click a row to open that
route's waterfall: click spans, API calls, and Web Vitals. No PII is ever shown.

A session is all the routes that share the `ux.session.id` resource attribute.
Pick one in the **Session** filter at the top of the dashboard to narrow every
panel to a single browser tab's journey.

### Interaction Quality

**Rage Clicks: User Frustration**: clicks that were part of three or more clicks on
the same element within 500 ms. A rage click means the user expected
a response and didn't get one. Attributes: `ux.element.label`, `ux.element.tag`,
`ux.element.role`.

**Dead Clicks: Broken Affordances**: clicks on a non-interactive element (div, span,
p, img, etc.). Indicates a visual affordance problem: something looks clickable but
isn't.

### Navigation & API

**Navigation Patterns** — every route transition in the selected window.
Attributes: `ux.route.from` (previous path), `ux.route.to` (target path),
`ux.route.trigger` (user / back-forward / initial). Use these to reconstruct
user flows and identify exit points. The panel leaves out `resume` spans: when a
user returns to a hidden tab, a new route span starts with
`ux.route.trigger = "resume"` so later activity still nests under a route, but
it is not a navigation.

**API Calls — User-Perceived Latency** — all outbound fetch calls sorted by
duration. `ux.api.user_wait_ms` is the time from the last interaction to the
response, reflecting what the user actually experienced. `ux.api.triggered_by`
shows which element caused the call.

### Reliability

**Form Submissions** — every form submit event. `ux.form.valid` shows whether
the browser's validation passed at submit time. `ux.form.attempts` counts total
submits for that form instance. Field values are never captured.

**JavaScript Errors** — unhandled exceptions and promise rejections.
Each span carries an `exception` event with `exception.type` (the constructor
name) and `exception.message` (sanitized — paths and query strings stripped).
Spans with errors have `status = ERROR` — you can alert on this in Grafana.

## TraceQL queries

Each panel uses [Grafana Tempo TraceQL](https://grafana.com/docs/tempo/latest/traceql/).
You can modify or extend the queries directly in the panel editor.

| Panel | TraceQL |
|---|---|
| Recent Routes | `{span:name=~"navigation.*" && resource.ux.session.id=~"$sessionId"}` |
| Rage Clicks | `{span.ux.rage_click=true && resource.ux.session.id=~"$sessionId"}` |
| Dead Clicks | `{span.ux.dead_click=true && resource.ux.session.id=~"$sessionId"}` |
| Navigation Patterns | `{span:name=~"navigation.*" && span.ux.route.trigger != "resume" && resource.ux.session.id=~"$sessionId"}` |
| API Calls | `{span.ux.api.user_wait_ms > 0 && resource.ux.session.id=~"$sessionId"}` |
| Form Submissions | `{span:name=~"form.submit.*" && resource.ux.session.id=~"$sessionId"}` |
| JavaScript Errors | `{span:name=~"error.*" && resource.ux.session.id=~"$sessionId"}` |

`$sessionId` is the Session filter. Its **All** value is `.*`, which matches every session.

## Alerting on errors

To alert when error rate exceeds a threshold, add a Grafana alert rule using
the JavaScript Errors panel query and set a threshold on the span count per
minute.

## Customizing the dashboard

The dashboard JSON is at `infra/grafana/provisioning/dashboards/blindspot-overview.json`.
Edit it and restart the Grafana container to pick up changes:

```bash
docker compose restart grafana
```

## Installing on your own Grafana

Import the dashboard JSON manually via **Dashboards → Import → Upload JSON file**,
then configure the Tempo data source to point at your Tempo instance.
