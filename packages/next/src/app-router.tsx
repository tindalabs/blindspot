'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  getTracer,
  setRouteSpan,
  clearRouteSpan,
  loadRouteContextAfterReload,
} from '@tindalabs/blindspot';

export function BlindspotAppRouter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchStr = searchParams?.toString();
  const search = searchStr ? `?${searchStr}` : '';
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const to = pathname + search;

    // React 18 StrictMode double-invokes effects. Skip if path unchanged and not
    // the initial render — we already created the span for this route.
    if (prevPath.current !== null && prevPath.current === to) return;

    const from = prevPath.current ?? '';
    const isFirst = prevPath.current === null;
    prevPath.current = to;

    clearRouteSpan();
    const trigger = isFirst ? 'initial' : 'user';
    const parentContext = isFirst ? loadRouteContextAfterReload() : undefined;
    const span = getTracer().startSpan(
      `navigation ${from || '(none)'} → ${to}`,
      {
        attributes: {
          'ux.route.from': from,
          'ux.route.to': to,
          'ux.route.trigger': trigger,
        },
      },
      parentContext,
    );
    setRouteSpan(span);
  }, [pathname, search]);

  return null;
}
