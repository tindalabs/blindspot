import { describe, it, expect, beforeEach } from 'vitest';
import { isElementBlocked, getElementLabel } from '../src/privacy/blocker.js';

describe('isElementBlocked', () => {
  it('blocks an element with data-blindspot-block attribute', () => {
    const el = document.createElement('div');
    el.setAttribute('data-blindspot-block', '');
    expect(isElementBlocked(el, [])).toBe(true);
  });

  it('returns false for a clean element with no selectors', () => {
    const el = document.createElement('button');
    expect(isElementBlocked(el, [])).toBe(false);
  });

  it('blocks an element matched by a configured selector', () => {
    const el = document.createElement('input');
    el.className = 'credit-card';
    document.body.appendChild(el);
    expect(isElementBlocked(el, ['.credit-card'])).toBe(true);
    document.body.removeChild(el);
  });

  it('blocks a child of a blocked ancestor selector', () => {
    const parent = document.createElement('div');
    parent.className = 'sensitive';
    const child = document.createElement('input');
    parent.appendChild(child);
    document.body.appendChild(parent);
    expect(isElementBlocked(child, ['.sensitive'])).toBe(true);
    document.body.removeChild(parent);
  });
});

describe('getElementLabel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('prefers data-blindspot-label', () => {
    const el = document.createElement('button');
    el.setAttribute('data-blindspot-label', 'submit-order');
    el.textContent = 'Place Order — $49.99';
    expect(getElementLabel(el)).toBe('submit-order');
  });

  it('falls back to aria-label', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-label', 'Close dialog');
    expect(getElementLabel(el)).toBe('Close dialog');
  });

  it('falls back to text content for button elements', () => {
    const el = document.createElement('button');
    el.textContent = 'Place Order';
    expect(getElementLabel(el)).toBe('Place Order');
  });

  it('truncates long text content to 64 characters', () => {
    const el = document.createElement('button');
    el.textContent = 'A'.repeat(80);
    expect(getElementLabel(el).length).toBe(64);
  });

  it('returns empty string for non-labelled non-inline elements', () => {
    const el = document.createElement('div');
    expect(getElementLabel(el)).toBe('');
  });
});
