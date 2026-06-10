const SESSION_KEY = 'blindspot.session_id';

function generateId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID: build a v4 UUID from
    // crypto.getRandomValues, which is cryptographically secure and has far
    // wider support than randomUUID. Math.random is intentionally avoided.
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }
  // Last resort for the rare runtime with no Web Crypto at all. This id is a
  // UX-telemetry session marker, not a security token, so a non-random
  // monotonic fallback is acceptable here.
  _fallbackCounter += 1;
  return `bs-${Date.now().toString(36)}-${_fallbackCounter.toString(36)}`;
}

let _fallbackCounter = 0;

export function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = generateId();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // sessionStorage unavailable (SSR, privacy mode, etc.)
    return generateId();
  }
}
