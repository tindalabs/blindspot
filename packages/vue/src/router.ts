import type { Router } from 'vue-router';
import { beginRouteSpan } from '@tindalabs/blindspot';

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
    beginRouteSpan({ from: prevPath, to: toPath, trigger });
    prevPath = toPath;
  });
}
