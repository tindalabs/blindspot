import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import { beginRouteSpan, type RouteTrigger } from '../context.js';

let _currentPath = '';

export function _resetRoutingForTesting(): void {
  _currentPath = '';
}

function navigate(to: string, from: string, trigger: RouteTrigger): void {
  const span = beginRouteSpan({ from, to, trigger });
  span.setAttribute('url.full', location.href);
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
