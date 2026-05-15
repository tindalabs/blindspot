import { describe, it, expect } from 'vitest';
import { sanitizeAttributes } from '../src/privacy/redactor.js';
import type { PrivacyConfig } from '../src/config.js';

const base: PrivacyConfig = {
  maskInputs: true,
  blockSelectors: [],
  piiPatterns: [],
  consentRequired: false,
  scrubAttributes: [],
};

describe('sanitizeAttributes', () => {
  it('returns the same object reference when no patterns are configured', () => {
    const attrs = { 'user.name': 'alice', count: 42 };
    expect(sanitizeAttributes(attrs, base)).toBe(attrs);
  });

  it('redacts string values matching a pattern', () => {
    const attrs = { 'card.number': '4111111111111111', 'user.name': 'alice' };
    const result = sanitizeAttributes(attrs, { ...base, piiPatterns: [/\b\d{16}\b/] });
    expect(result['card.number']).toBe('[redacted]');
    expect(result['user.name']).toBe('alice');
  });

  it('leaves non-string attribute values untouched', () => {
    const attrs = { count: 42, flag: true };
    const result = sanitizeAttributes(attrs, { ...base, piiPatterns: [/\d+/] });
    expect(result['count']).toBe(42);
    expect(result['flag']).toBe(true);
  });

  it('redacts matching strings within arrays', () => {
    const attrs = { tags: ['4111111111111111', 'safe-tag'] };
    const result = sanitizeAttributes(attrs, { ...base, piiPatterns: [/\b\d{16}\b/] });
    expect(result['tags']).toEqual(['[redacted]', 'safe-tag']);
  });

  it('redacts on first matching pattern and stops', () => {
    const attrs = { val: 'secret-123' };
    const result = sanitizeAttributes(attrs, {
      ...base,
      piiPatterns: [/secret/, /\d{3}/],
    });
    expect(result['val']).toBe('[redacted]');
  });

  it('does not mutate the original attributes object', () => {
    const attrs = { email: 'user@example.com' };
    sanitizeAttributes(attrs, { ...base, piiPatterns: [/@/] });
    expect(attrs['email']).toBe('user@example.com');
  });

  it('strips keys listed in scrubAttributes', () => {
    const attrs = { 'user.id': 'u-123', 'session.token': 'tok-abc', count: 42 };
    const result = sanitizeAttributes(attrs, { ...base, scrubAttributes: ['session.token'] });
    expect(result['session.token']).toBeUndefined();
    expect(result['user.id']).toBe('u-123');
    expect(result['count']).toBe(42);
  });

  it('strips scrubAttributes keys even when piiPatterns is empty', () => {
    const attrs = { secret: 'value', safe: 'ok' };
    const result = sanitizeAttributes(attrs, { ...base, scrubAttributes: ['secret'] });
    expect(result['secret']).toBeUndefined();
    expect(result['safe']).toBe('ok');
  });

  it('applies both scrubAttributes and piiPatterns independently', () => {
    const attrs = { 'card.number': '4111111111111111', 'auth.token': 'bearer-xyz', label: 'ok' };
    const result = sanitizeAttributes(attrs, {
      ...base,
      scrubAttributes: ['auth.token'],
      piiPatterns: [/\b\d{16}\b/],
    });
    expect(result['auth.token']).toBeUndefined();
    expect(result['card.number']).toBe('[redacted]');
    expect(result['label']).toBe('ok');
  });

  it('returns same reference when scrubAttributes and piiPatterns are both empty', () => {
    const attrs = { key: 'value' };
    expect(sanitizeAttributes(attrs, base)).toBe(attrs);
  });
});
