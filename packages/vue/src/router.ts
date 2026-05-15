import type { Router } from 'vue-router';
import {
  getTracer,
  setRouteSpan,
  clearRouteSpan,
  loadRouteContextAfterReload,
} from '@tindalabs/blindspot';

export function installBlindspotRouter(router: Router): void {
  let isFirst = true;
  let prevPath = '';

  router.beforeEach(() => {
    clearRouteSpan();
  });

  router.afterEach((to) => {
    const toPath = to.fullPath;
    const trigger = isFirst ? 'initial' : 'user';
    isFirst = false;
    const parentContext =
      trigger === 'initial' ? loadRouteContextAfterReload() : undefined;
    const span = getTracer().startSpan(
      `navigation ${prevPath || '(none)'} → ${toPath}`,
      {
        attributes: {
          'ux.route.from': prevPath,
          'ux.route.to': toPath,
          'ux.route.trigger': trigger,
        },
      },
      parentContext,
    );
    setRouteSpan(span);
    prevPath = toPath;
  });
}
