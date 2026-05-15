import type { App } from 'vue';
import type { Router } from 'vue-router';
import type { BlindspotConfig } from '@tindalabs/blindspot';
import { init } from '@tindalabs/blindspot';
import { installBlindspotRouter } from './router.js';

export interface BlindspotPluginOptions {
  config: BlindspotConfig;
  router?: Router;
}

export const BlindspotPlugin = {
  install(_app: App, { config, router }: BlindspotPluginOptions) {
    init({ ...config, instrument: { ...config.instrument, routing: false } });
    if (router !== undefined) {
      installBlindspotRouter(router);
    }
  },
};
