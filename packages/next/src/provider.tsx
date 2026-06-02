'use client';
import { Suspense, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { BlindspotConfig } from '@tindalabs/blindspot';
import { init } from '@tindalabs/blindspot';
import { BlindspotAppRouter } from './app-router.js';

export interface BlindspotProviderProps {
  config: BlindspotConfig;
  children: ReactNode;
}

export function BlindspotProvider({ config, children }: BlindspotProviderProps) {
  const initialized = useRef(false);

  // useLayoutEffect fires before any useEffect in the tree so BlindspotAppRouter's
  // useEffect always sees an initialized SDK.
  useLayoutEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    init({ ...config, instrument: { ...config.instrument, routing: false } });
  }, []);

  return (
    <>
      <Suspense>
        <BlindspotAppRouter />
      </Suspense>
      {children}
    </>
  );
}
