import { getRouteSpan } from '@tindalabs/blindspot';
import type { AttributeValue } from '@opentelemetry/api';

interface SpanHandle {
  addEvent(name: string, attributes?: Record<string, AttributeValue>): void;
  setAttribute(key: string, value: AttributeValue): void;
}

export function useSpan(): SpanHandle {
  return {
    addEvent(name, attributes) {
      getRouteSpan()?.addEvent(name, attributes);
    },
    setAttribute(key, value) {
      getRouteSpan()?.setAttribute(key, value);
    },
  };
}
