const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
// murmur3 fmix32 multipliers.
const FMIX32_C1 = 0x85ebca6b;
const FMIX32_C2 = 0xc2b2ae35;
const UINT32_RANGE = 2 ** 32;

// FNV-1a alone barely changes the high bits for ids that differ only at the end,
// such as the counter-based fallback session ids, so sessions created together
// would be kept or dropped together. murmur3's fmix32 finalizer spreads them.
function hashToUnitInterval(value: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, FMIX32_C1);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, FMIX32_C2);
  hash ^= hash >>> 16;
  return (hash >>> 0) / UINT32_RANGE;
}

/**
 * Whether a session is in the sample. Derived from the session id rather than
 * rolled per trace or per page load, so a session is kept or dropped whole: with
 * one trace per route, a per-trace decision would export a random subset of each
 * session's routes. The same tab gets the same answer across reloads.
 */
export function isSessionSampled(sessionId: string, rate: number): boolean {
  return hashToUnitInterval(sessionId) < rate;
}
