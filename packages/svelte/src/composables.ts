import type { SpanAttributes } from '@opentelemetry/api';
import { getTracer, getRouteSpan, getRouteContext } from '@tindalabs/blindspot';

export interface BlindspotHandle {
  addEvent(name: string, attributes?: SpanAttributes): void;
  setAttribute(key: string, value: string | number | boolean): void;
  startSpan(name: string, fn: () => void): void;
}

export function useBlindspot(): BlindspotHandle {
  return {
    addEvent(name, attributes) {
      getRouteSpan()?.addEvent(name, attributes);
    },
    setAttribute(key, value) {
      getRouteSpan()?.setAttribute(key, value);
    },
    startSpan(name, fn) {
      const span = getTracer().startSpan(name, {}, getRouteContext());
      try {
        fn();
      } finally {
        span.end();
      }
    },
  };
}
