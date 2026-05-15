import { describe, it, expect, beforeEach } from 'vitest';
import { scrubDynamicSegments, isLabelSensitive } from '../src/privacy/scrubber.js';

// ─── scrubDynamicSegments ─────────────────────────────────────────────────────

describe('scrubDynamicSegments', () => {
  it('leaves plain human-readable text unchanged', () => {
    expect(scrubDynamicSegments('Add to cart')).toBe('Add to cart');
    expect(scrubDynamicSegments('Place Order')).toBe('Place Order');
    expect(scrubDynamicSegments('Submit')).toBe('Submit');
  });

  it('strips Styled Components class hashes (sc-Xxxx)', () => {
    expect(scrubDynamicSegments('sc-dkPtRN')).toBe('');
    expect(scrubDynamicSegments('button sc-bdfxAY')).toBe('button');
  });

  it('strips Emotion CSS-in-JS class hashes (css-Xxxx)', () => {
    expect(scrubDynamicSegments('css-1x3j7')).toBe('');
    expect(scrubDynamicSegments('label css-abcDEF')).toBe('label');
  });

  it('strips UUIDs', () => {
    expect(scrubDynamicSegments('tooltip-123e4567-e89b-12d3-a456-426614174000')).toBe('tooltip-');
    expect(scrubDynamicSegments('item 123e4567-e89b-12d3-a456-426614174000 end')).toBe('item end');
  });

  it('strips long lowercase hex strings (8+ chars)', () => {
    expect(scrubDynamicSegments('deadbeefcafe1234')).toBe('');
    expect(scrubDynamicSegments('hash abcdef12 end')).toBe('hash end');
  });

  it('does not strip uppercase text (avoids false-positives on button labels)', () => {
    expect(scrubDynamicSegments('ADD TO CART')).toBe('ADD TO CART');
    expect(scrubDynamicSegments('AAAAAAAAAA')).toBe('AAAAAAAAAA');
  });

  it('strips long numeric IDs (5+ consecutive digits)', () => {
    expect(scrubDynamicSegments('item-123456')).toBe('item-');
    expect(scrubDynamicSegments('row 99999 col')).toBe('row col');
  });

  it('preserves short numbers (prices, counts)', () => {
    expect(scrubDynamicSegments('3 items')).toBe('3 items');
    expect(scrubDynamicSegments('Add 2')).toBe('Add 2');
  });

  it('collapses multiple spaces after scrubbing', () => {
    expect(scrubDynamicSegments('button  sc-dkPtRN  label')).toBe('button label');
  });

  it('trims whitespace from result', () => {
    expect(scrubDynamicSegments('  sc-dkPtRN  ')).toBe('');
  });
});

// ─── isLabelSensitive ─────────────────────────────────────────────────────────

function makeInput(attrs: Record<string, string> = {}): HTMLInputElement {
  const el = document.createElement('input');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

describe('isLabelSensitive', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns false for a plain unlabelled input', () => {
    const input = makeInput({ type: 'text' });
    document.body.appendChild(input);
    expect(isLabelSensitive(input)).toBe(false);
  });

  it('detects password label', () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'pw');
    label.textContent = 'Password';
    const input = makeInput({ id: 'pw', type: 'text' });
    document.body.appendChild(label);
    document.body.appendChild(input);
    expect(isLabelSensitive(input)).toBe(true);
  });

  it('detects email label', () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'em');
    label.textContent = 'Email address';
    const input = makeInput({ id: 'em' });
    document.body.appendChild(label);
    document.body.appendChild(input);
    expect(isLabelSensitive(input)).toBe(true);
  });

  it('detects phone / mobile label', () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'ph');
    label.textContent = 'Mobile number';
    const input = makeInput({ id: 'ph' });
    document.body.appendChild(label);
    document.body.appendChild(input);
    expect(isLabelSensitive(input)).toBe(true);
  });

  it('detects SSN-related label', () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'ssn');
    label.textContent = 'Social Security Number';
    const input = makeInput({ id: 'ssn' });
    document.body.appendChild(label);
    document.body.appendChild(input);
    expect(isLabelSensitive(input)).toBe(true);
  });

  it('detects wrapping <label> ancestor', () => {
    const label = document.createElement('label');
    label.textContent = 'Card number';
    const input = makeInput({ type: 'text' });
    label.appendChild(input);
    document.body.appendChild(label);
    expect(isLabelSensitive(input)).toBe(true);
  });

  it('detects aria-label on the element itself', () => {
    const input = makeInput({ 'aria-label': 'Enter your date of birth' });
    document.body.appendChild(input);
    expect(isLabelSensitive(input)).toBe(true);
  });

  it('returns false for a non-sensitive label', () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'search');
    label.textContent = 'Search products';
    const input = makeInput({ id: 'search' });
    document.body.appendChild(label);
    document.body.appendChild(input);
    expect(isLabelSensitive(input)).toBe(false);
  });

  it('is case-insensitive', () => {
    const input = makeInput({ 'aria-label': 'EMAIL ADDRESS' });
    document.body.appendChild(input);
    expect(isLabelSensitive(input)).toBe(true);
  });
});
