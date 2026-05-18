import { init as coreInit, resolveConfig } from '@tindalabs/blindspot-core';
import type { BlindspotConfig } from '@tindalabs/blindspot-core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BeaconExporter } from './beacon.js';
import { initRouting } from './instrumentations/routing.js';
import { initClicks } from './instrumentations/clicks.js';
import { initForms } from './instrumentations/forms.js';
import { initFetch } from './instrumentations/fetch.js';
import { initVitals } from './instrumentations/vitals.js';
import { initErrors } from './instrumentations/errors.js';
import { initLifecycle } from './instrumentations/lifecycle.js';
import { initBehavior } from './instrumentations/behavior.js';

let _initialized = false;

export function init(config: BlindspotConfig): void {
  if (_initialized) return;
  _initialized = true;
  const resolved = resolveConfig(config);
  const otlpExporter = new OTLPTraceExporter({ url: resolved.endpoint });
  const beaconExporter = new BeaconExporter(otlpExporter, resolved.endpoint);
  coreInit(config, beaconExporter);

  if (resolved.instrument.routing) initRouting(resolved);
  if (resolved.instrument.clicks) initClicks(resolved);
  if (resolved.instrument.forms) initForms(resolved);
  if (resolved.instrument.fetch) initFetch(resolved);
  if (resolved.instrument.vitals) initVitals(resolved);
  if (resolved.instrument.errors) initErrors(resolved);
  initLifecycle(resolved, beaconExporter);
  initBehavior(resolved);
}
