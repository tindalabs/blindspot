import { onLCP, onCLS, onINP } from 'web-vitals';
import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import { getRouteSpan } from '../context.js';

export function initVitals(_config: ResolvedConfig): void {
  onLCP(({ value }) => getRouteSpan()?.addEvent('lcp', { 'web_vital.value': value }));
  onCLS(({ value }) => getRouteSpan()?.addEvent('cls', { 'web_vital.value': value }));
  onINP(({ value }) => getRouteSpan()?.addEvent('inp', { 'web_vital.value': value }));
}
