import type { BlindspotConfig } from '@tindalabs/blindspot';
import { init } from '@tindalabs/blindspot';

export function initBlindspot(config: BlindspotConfig): void {
  if (typeof window === 'undefined') return;
  init({ ...config, instrument: { ...config.instrument, routing: false } });
}
