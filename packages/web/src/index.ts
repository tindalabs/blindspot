export { init } from './init.js';
export {
  beginRouteSpan,
  setRouteSpan,
  clearRouteSpan,
  getRouteSpan,
  getRouteContext,
  getSessionTraceparent,
} from './context.js';
export {
  grantConsent,
  revokeConsent,
  recordEvent,
  getTracer,
  isElementBlocked,
  getElementLabel,
  ConsentGate,
} from '@tindalabs/blindspot-core';
export type { RouteChange, RouteTrigger } from './context.js';
export type {
  BlindspotConfig,
  ResolvedConfig,
  PrivacyConfig,
  InstrumentConfig,
} from '@tindalabs/blindspot-core';
