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

  router.afterEach((to) => {
    const toPath = to.fullPath;
    const trigger = isFirst ? 'initial' : 'user';
    isFirst = false;

    // End the previous route span and open the new one atomically, so a route
    // span is active at all times. Doing the clear in a separate beforeEach left
    // a window where getRouteContext() was root — any click/fetch/error fired in
    // that gap orphaned into its own root trace instead of nesting under the
    // route. Mirrors the React adapter's single-effect clear → create → set.
    clearRouteSpan();

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
