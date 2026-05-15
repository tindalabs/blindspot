import { createContext, useContext } from 'react';

export const BlindspotContext = createContext(false);

export function useBlindspotContext(): boolean {
  return useContext(BlindspotContext);
}
