export { init } from './init.js';
export {
  setRouteSpan,
  clearRouteSpan,
  getRouteSpan,
  getRouteContext,
  getSessionTraceparent,
  loadRouteContextAfterReload,
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
export type {
  BlindspotConfig,
  ResolvedConfig,
  PrivacyConfig,
  InstrumentConfig,
} from '@tindalabs/blindspot-core';
