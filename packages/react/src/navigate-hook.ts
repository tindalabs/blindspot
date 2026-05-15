import { useEffect, useRef } from 'react';
import { clearRouteSpan, getTracer, loadRouteContextAfterReload, setRouteSpan } from '@tindalabs/blindspot';

export function useBlindspotNavigate(
  pathname: string,
  search: string,
  trigger?: 'user' | 'back-forward',
): void {
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const to = pathname + search;

    // React 18 StrictMode double-invokes effects. If the path hasn't changed and
    // this isn't the initial render, we've already created the span — skip.
    if (prevPath.current !== null && prevPath.current === to) return;

    const from = prevPath.current ?? '';
    const effectiveTrigger =
      prevPath.current === null ? 'initial' : (trigger ?? 'user');

    prevPath.current = to;
    clearRouteSpan();

    const parentContext =
      effectiveTrigger === 'initial' ? loadRouteContextAfterReload() : undefined;

    const span = getTracer().startSpan(
      `navigation ${from || '(none)'} → ${to}`,
      {
        attributes: {
          'ux.route.from': from,
          'ux.route.to': to,
          'ux.route.trigger': effectiveTrigger,
        },
      },
      parentContext,
    );

    setRouteSpan(span);
  }, [pathname, search, trigger]);
}
