import { getTracer } from '@tindalabs/blindspot-core';
import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import type { Context } from '@opentelemetry/api';
import { setRouteSpan, clearRouteSpan } from '../context.js';

let _currentPath = '';

export function _resetRoutingForTesting(): void {
  _currentPath = '';
}

function navigate(to: string, from: string, trigger: 'user' | 'initial' | 'back-forward', parentContext?: Context): void {
  clearRouteSpan();

  const span = getTracer().startSpan(`navigation ${from || '(none)'} → ${to}`, {
    attributes: {
      'ux.route.from': from,
      'ux.route.to': to,
      'ux.route.trigger': trigger,
      'url.full': location.href,
    },
  }, parentContext);

  setRouteSpan(span);
  _currentPath = to;
}

export function initRouting(_config: ResolvedConfig): void {
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = (...args: Parameters<History['pushState']>): void => {
    origPush(...args);
    navigate(location.pathname + location.search, _currentPath, 'user');
  };

  history.replaceState = (...args: Parameters<History['replaceState']>): void => {
    origReplace(...args);
    navigate(location.pathname + location.search, _currentPath, 'user');
  };

  window.addEventListener('popstate', () => {
    navigate(location.pathname + location.search, _currentPath, 'back-forward');
  });

  navigate(location.pathname + location.search, '', 'initial');
}
