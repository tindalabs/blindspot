import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsentGate } from '../src/privacy/consent.js';

describe('ConsentGate', () => {
  let gate: ConsentGate;

  beforeEach(() => {
    gate = new ConsentGate();
  });

  it('starts in the not-granted state', () => {
    expect(gate.isGranted()).toBe(false);
  });

  it('transitions to granted after grant()', () => {
    gate.grant();
    expect(gate.isGranted()).toBe(true);
  });

  it('transitions back to not-granted after revoke()', () => {
    gate.grant();
    gate.revoke();
    expect(gate.isGranted()).toBe(false);
  });

  it('calls listeners with true when consent is granted', () => {
    const listener = vi.fn();
    gate.onChange(listener);
    gate.grant();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('calls listeners with false when consent is revoked', () => {
    const listener = vi.fn();
    gate.onChange(listener);
    gate.grant();
    gate.revoke();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(false);
  });

  it('stops calling a listener after unsubscribe', () => {
    const listener = vi.fn();
    const unsub = gate.onChange(listener);
    unsub();
    gate.grant();
    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple independent listeners', () => {
    const a = vi.fn();
    const b = vi.fn();
    gate.onChange(a);
    gate.onChange(b);
    gate.grant();
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});
