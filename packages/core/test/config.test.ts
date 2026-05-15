import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../src/config.js';

describe('resolveConfig', () => {
  const minimal = { endpoint: 'http://localhost:4318/v1/traces', serviceName: 'test' };

  it('applies privacy defaults when privacy is omitted', () => {
    const { privacy } = resolveConfig(minimal);
    expect(privacy.maskInputs).toBe(true);
    expect(privacy.blockSelectors).toEqual([]);
    expect(privacy.piiPatterns).toEqual([]);
    expect(privacy.consentRequired).toBe(false);
  });

  it('applies sampling default of 1.0', () => {
    expect(resolveConfig(minimal).sampling.rate).toBe(1.0);
  });

  it('enables all instrumentations by default', () => {
    const { instrument } = resolveConfig(minimal);
    expect(Object.values(instrument).every(Boolean)).toBe(true);
  });

  it('merges partial privacy overrides', () => {
    const { privacy } = resolveConfig({ ...minimal, privacy: { consentRequired: true } });
    expect(privacy.consentRequired).toBe(true);
    expect(privacy.maskInputs).toBe(true);
  });

  it('passes through endpoint and serviceName', () => {
    const resolved = resolveConfig(minimal);
    expect(resolved.endpoint).toBe(minimal.endpoint);
    expect(resolved.serviceName).toBe(minimal.serviceName);
  });
});
