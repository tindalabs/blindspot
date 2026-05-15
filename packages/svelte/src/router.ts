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

  hooks.beforeNavigate(() => {
    clearRouteSpan();
  });

  hooks.afterNavigate((nav) => {
    const search = nav.to.url.search;
    const toPath = nav.to.url.pathname + (search ? search : '');
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
