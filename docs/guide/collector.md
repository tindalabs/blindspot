# OTel Collector Setup

An OpenTelemetry Collector sits between the browser SDK and your observability
backend. It handles CORS termination, enrichment, and routing — so the SDK only
needs to talk to one endpoint regardless of how many backends you use.

## Why use a collector

| Without collector | With collector |
|---|---|
| Browser sends directly to backend | Browser sends to collector |
| Backend must handle CORS | Collector handles CORS |
| One backend per app | Route to multiple backends simultaneously |
| No enrichment | Add resource attributes, filter spans |
| Backend credentials in browser | Credentials stay server-side |

## Local dev stack (included)

The repo ships a pre-configured `docker-compose.yml`:

```bash
docker compose up -d
```

Starts three services:

- **OTel Collector** — `http://localhost:4318` (OTLP/HTTP, CORS open for localhost)
- **Grafana Tempo** — internal, receives spans from the collector
- **Grafana** — `http://localhost:3100`, queries Tempo via TraceQL

Open Grafana and navigate to **Dashboards → Blindspot — Overview** to see
incoming traces.

## Collector configuration

The included config at `infra/otel-collector.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: "0.0.0.0:4318"
        cors:
          allowed_origins: ["http://localhost:*", "http://127.0.0.1:*"]
          allowed_headers: ["*"]

processors:
  batch:

exporters:
  otlp/tempo:
    endpoint: "tempo:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
```

## Production setup

For production, replace `allowed_origins` with your actual domain and add an
exporter for your chosen backend.

### Sending to Grafana Cloud

```yaml
exporters:
  otlp/grafana:
    endpoint: "otlp-gateway-prod-us-central-0.grafana.net:443"
    headers:
      Authorization: "Basic <base64(instanceId:token)>"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/grafana]
```

### Sending to Honeycomb

```yaml
exporters:
  otlp/honeycomb:
    endpoint: "api.honeycomb.io:443"
    headers:
      x-honeycomb-team: "${HONEYCOMB_API_KEY}"
```

### Sending to multiple backends simultaneously

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo, otlp/honeycomb]
```

## Configuring the SDK endpoint

Point `init()` at your collector's OTLP/HTTP endpoint:

```typescript
init({
  serviceName: 'storefront',
  endpoint: 'https://otel-collector.example.com/v1/traces',
})
```

The path `/v1/traces` is the standard OTLP/HTTP traces path. The collector
listens on it by default.

## Direct-to-backend (no collector)

If your backend accepts OTLP/HTTP directly from the browser and handles CORS
itself, you can skip the collector:

```typescript
init({
  serviceName: 'storefront',
  endpoint: 'https://api.honeycomb.io/v1/traces',
})
```

Note that backend credentials would be visible in the browser in this case. A
collector with authentication is strongly recommended for production.
