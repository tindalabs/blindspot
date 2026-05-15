import { getTracer, isElementBlocked, getElementLabel, isLabelSensitive } from '@tindalabs/blindspot-core';
import type { ResolvedConfig } from '@tindalabs/blindspot-core';
import { getRouteContext, setLastInteractionLabel } from '../context.js';

const _recentClicks = new WeakMap<Element, number[]>();

const SENSITIVE_INPUT_TYPES = new Set(['password', 'email', 'tel']);

function isSensitiveInput(el: Element): boolean {
  if (el.tagName.toLowerCase() !== 'input') return false;
  return SENSITIVE_INPUT_TYPES.has((el as HTMLInputElement).type.toLowerCase());
}

function detectRageClick(element: Element): boolean {
  const now = Date.now();
  const prev = _recentClicks.get(element) ?? [];
  const recent = [...prev.filter((t) => now - t < 500), now];
  _recentClicks.set(element, recent);
  return recent.length >= 3;
}

function isInteractiveElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (['button', 'a', 'input', 'select', 'textarea', 'label'].includes(tag)) return true;
  const role = el.getAttribute('role');
  if (role === 'button' || role === 'link' || role === 'menuitem') return true;
  if (el.hasAttribute('tabindex') || el.hasAttribute('onclick')) return true;
  return false;
}

export function initClicks(config: ResolvedConfig): void {
  window.addEventListener(
    'click',
    (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (isElementBlocked(target, config.privacy.blockSelectors)) return;
      if (isSensitiveInput(target)) return;
      if (isLabelSensitive(target)) return;

      const label = getElementLabel(target);
      const tag = target.tagName.toLowerCase();

      const span = getTracer().startSpan(
        `click ${tag}${label ? `[${label}]` : ''}`,
        {
          attributes: {
            'ux.interaction.type': 'click',
            'ux.element.tag': tag,
            'ux.element.role': target.getAttribute('role') ?? tag,
            'ux.element.label': label,
            'ux.element.disabled': target.hasAttribute('disabled'),
            'ux.rage_click': detectRageClick(target),
            'ux.dead_click': !isInteractiveElement(target),
          },
        },
        getRouteContext(),
      );

      setLastInteractionLabel(label || tag);
      span.end();
    },
    { capture: true },
  );
}
