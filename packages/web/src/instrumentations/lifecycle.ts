import { getProcessor } from '@tindalabs/blindspot-core';
import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import { resumeRouteSpan, suspendRouteSpan } from '../context.js';
import type { BeaconExporter } from '../beacon.js';

export function initLifecycle(_config: ResolvedConfig, beaconExporter: BeaconExporter): void {
  const flush = (): void => {
    suspendRouteSpan();
    if (_config.sampling.errorAware) {
      getProcessor()?.commitSession();
    }
    beaconExporter.useBeaconForNextExport();
    void getProcessor()?.forceFlush();
  };

  // web-vitals reports CLS and INP from a capture-phase visibilitychange listener on
  // window, which runs before this bubble-phase one on document, so both land on the
  // route span before flush() ends it. Moving this listener to window or to the capture
  // phase can let it run first and silently drop them (covered by the e2e vitals test).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else resumeRouteSpan();
  });

  window.addEventListener('pagehide', flush);

  // A page restored from the back/forward cache fires pageshow, not a fresh init().
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) resumeRouteSpan();
  });
}
