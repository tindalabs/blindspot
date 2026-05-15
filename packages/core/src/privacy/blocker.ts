import { scrubDynamicSegments } from './scrubber.js';

const BLOCK_ATTR = 'data-blindspot-block';
const LABEL_ATTR = 'data-blindspot-label';
const INLINE_LABEL_TAGS = new Set(['button', 'a', 'label']);

export function isElementBlocked(element: Element, selectors: string[]): boolean {
  if (element.hasAttribute(BLOCK_ATTR)) return true;
  if (selectors.length === 0) return false;
  return selectors.some(
    (selector) => element.matches(selector) || element.closest(selector) !== null,
  );
}

export function getElementLabel(element: Element): string {
  // Explicit developer annotation — never scrub, it is intentional.
  const explicit = element.getAttribute(LABEL_ATTR);
  if (explicit) return explicit;

  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return scrubDynamicSegments(ariaLabel);

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl?.textContent) return scrubDynamicSegments(labelEl.textContent.trim());
  }

  if (INLINE_LABEL_TAGS.has(element.tagName.toLowerCase())) {
    return scrubDynamicSegments((element.textContent ?? '').trim().slice(0, 64));
  }

  return '';
}
