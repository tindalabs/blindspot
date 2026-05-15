import { trace } from '@opentelemetry/api';
import type { Attributes } from '@opentelemetry/api';
import { getProcessor } from './init.js';

export { init, getProcessor } from './init.js';
export { getTracer } from './tracer.js';
export { resolveConfig } from './config.js';
export { sanitizeAttributes, isElementBlocked, getElementLabel, scrubDynamicSegments, isLabelSensitive } from './privacy/index.js';
export { ConsentGate } from './privacy/consent.js';
export type { BlindspotConfig, ResolvedConfig, PrivacyConfig, InstrumentConfig } from './config.js';

export function grantConsent(): void {
  getProcessor()?.consentGate.grant();
}

export function revokeConsent(): void {
  getProcessor()?.consentGate.revoke();
}

export function recordEvent(name: string, attributes?: Attributes): void {
  trace.getActiveSpan()?.addEvent(name, attributes);
}
