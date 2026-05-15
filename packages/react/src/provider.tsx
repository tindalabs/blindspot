import type { BlindspotConfig } from '@tindalabs/blindspot';
import { init } from '@tindalabs/blindspot';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { BlindspotContext } from './context.js';

interface BlindspotProviderProps {
  config: BlindspotConfig;
  children: ReactNode;
}

export function BlindspotProvider({ config, children }: BlindspotProviderProps) {
  const initialized = useRef(false);

  // useLayoutEffect fires synchronously after DOM commit and before any useEffect
  // in the tree, so child components' useEffect callbacks (e.g. useBlindspotNavigate)
  // always see an initialized SDK.
  useLayoutEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // Routing is handled by <BlindspotRoutes> or useBlindspotNavigate
    init({ ...config, instrument: { ...config.instrument, routing: false } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BlindspotContext.Provider value={true}>
      {children}
    </BlindspotContext.Provider>
  );
}
