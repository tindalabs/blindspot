import { getTracer, scrubDynamicSegments } from '@tindalabs/blindspot-core';
import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import { getRouteContext } from '../context.js';

const _submitCounts = new WeakMap<HTMLFormElement, number>();

export function initForms(_config: ResolvedConfig): void {
  window.addEventListener(
    'submit',
    (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;

      const count = (_submitCounts.get(form) ?? 0) + 1;
      _submitCounts.set(form, count);

      const formName = scrubDynamicSegments(form.name || form.id || '');

      const span = getTracer().startSpan(
        `form.submit ${formName || '(anonymous)'}`,
        {
          attributes: {
            'ux.form.name': formName,
            'ux.form.valid': form.checkValidity(),
            'ux.form.attempts': count,
          },
        },
        getRouteContext(),
      );

      span.end();
    },
    { capture: true },
  );
}
