'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  getTracer,
  setRouteSpan,
  clearRouteSpan,
  loadRouteContextAfterReload,
} from '@tindalabs/blindspot';

export function BlindspotPagesRouter() {
  const router = useRouter();
  const prevPath = useRef('');

  useEffect(() => {
    const initialPath = router.asPath;
    const parentContext = loadRouteContextAfterReload();
    const span = getTracer().startSpan(
      `navigation (none) → ${initialPath}`,
      {
        attributes: {
          'ux.route.from': '',
          'ux.route.to': initialPath,
          'ux.route.trigger': 'initial',
        },
      },
      parentContext,
    );
    setRouteSpan(span);
    prevPath.current = initialPath;

    function onRouteChangeStart() {
      clearRouteSpan();
    }

    function onRouteChangeComplete(url: string) {
      const from = prevPath.current;
      const nextSpan = getTracer().startSpan(
        `navigation ${from} → ${url}`,
        {
          attributes: {
            'ux.route.from': from,
            'ux.route.to': url,
            'ux.route.trigger': 'user',
          },
        },
      );
      setRouteSpan(nextSpan);
      prevPath.current = url;
    }

    router.events.on('routeChangeStart', onRouteChangeStart);
    router.events.on('routeChangeComplete', onRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', onRouteChangeStart);
      router.events.off('routeChangeComplete', onRouteChangeComplete);
      clearRouteSpan();
    };
  }, []);

  return null;
}
