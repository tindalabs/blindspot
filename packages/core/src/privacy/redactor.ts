import type { Attributes, AttributeValue } from '@opentelemetry/api';
import type { TimedEvent } from '@opentelemetry/sdk-trace-base';
import type { PrivacyConfig } from '../config.js';

const REDACTED = '[redacted]';

function redactValue(value: AttributeValue, patterns: RegExp[]): AttributeValue {
  if (typeof value !== 'string') return value;
  for (const pattern of patterns) {
    // String#search ignores the /g and /y flags and leaves lastIndex untouched;
    // RegExp#test on a user-supplied /g pattern would resume from the previous
    // match position and let every other matching value through.
    if (value.search(pattern) !== -1) return REDACTED;
  }
  return value;
}

export function sanitizeAttributes(attributes: Attributes, config: PrivacyConfig): Attributes {
  const hasPii = config.piiPatterns.length > 0;
  const hasScrubbedKeys = config.scrubAttributes.length > 0;
  if (!hasPii && !hasScrubbedKeys) return attributes;

  const scrubSet = new Set(config.scrubAttributes);
  const result: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) continue;
    if (scrubSet.has(key)) continue;
    if (!hasPii) {
      result[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      result[key] = (value as AttributeValue[]).map((v) =>
        redactValue(v, config.piiPatterns),
      ) as unknown as AttributeValue;
    } else {
      result[key] = redactValue(value as AttributeValue, config.piiPatterns);
    }
  }
  return result;
}

export function sanitizeEvents(events: TimedEvent[], config: PrivacyConfig): TimedEvent[] {
  return events.map((event) =>
    event.attributes === undefined
      ? event
      : { ...event, attributes: sanitizeAttributes(event.attributes, config) },
  );
}
