import {
  getTracer,
  setRouteSpan,
  clearRouteSpan,
  loadRouteContextAfterReload,
} from '@tindalabs/blindspot';

export interface NavigationLocation {
  url: { pathname: string; search: string };
}

export interface NavigationEvent {
  from: NavigationLocation | null;
  to: NavigationLocation;
  type: string;
}

export interface NavigationHooks {
  beforeNavigate: (callback: (nav: { cancel: () => void }) => void) => void;
  afterNavigate: (callback: (nav: NavigationEvent) => void) => void;
}

export function installBlindspotRouter(hooks: NavigationHooks): void {
  if (typeof window === 'undefined') return;

  let isFirst = true;
  let prevPath = '';

  hooks.afterNavigate((nav) => {
    const search = nav.to.url.search;
    const toPath = nav.to.url.pathname + (search ? search : '');
    const trigger = isFirst ? 'initial' : 'user';
    isFirst = false;

    // End the previous route span and open the new one atomically, so a route
    // span is active at all times. Clearing in a separate beforeNavigate left a
    // window where getRouteContext() was root — in-route clicks/fetch/errors
    // fired in that gap orphaned into their own root trace instead of nesting.
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
