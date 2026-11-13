'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { beginRouteSpan, clearRouteSpan } from '@tindalabs/blindspot';

export function BlindspotPagesRouter() {
  const router = useRouter();
  const prevPath = useRef('');

  useEffect(() => {
    const initialPath = router.asPath;
    beginRouteSpan({ from: '', to: initialPath, trigger: 'initial' });
    prevPath.current = initialPath;

    function onRouteChangeComplete(url: string) {
      const from = prevPath.current;
      // End the previous route span and open the new one atomically here, on
      // routeChangeComplete. Clearing on routeChangeStart instead left the route
      // context root for the whole navigation, so in-route activity that fired
      // during the transition orphaned into its own root trace.
      beginRouteSpan({ from, to: url, trigger: 'user' });
      prevPath.current = url;
    }

    router.events.on('routeChangeComplete', onRouteChangeComplete);

    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete);
      clearRouteSpan();
    };
  }, []);

  return null;
}
