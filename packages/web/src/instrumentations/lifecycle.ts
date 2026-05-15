import { getProcessor } from '@tindalabs/blindspot-core';
import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import { clearRouteSpan, saveRouteContextForReload } from '../context.js';
import type { BeaconExporter } from '../beacon.js';

export function initLifecycle(_config: ResolvedConfig, beaconExporter: BeaconExporter): void {
  const flush = (): void => {
    saveRouteContextForReload();
    clearRouteSpan();
    if (_config.sampling.errorAware) {
      getProcessor()?.commitSession(_config.sampling.rate);
    }
    beaconExporter.useBeaconForNextExport();
    void getProcessor()?.forceFlush();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  window.addEventListener('pagehide', flush);
}
