/**
 * Patterns that identify auto-generated values that should not appear in span names.
 * Applied to derived labels (aria-label, aria-labelledby, textContent) — never
 * to explicit data-blindspot-label values, which are developer-controlled.
 */
const GENERATED_PATTERNS: RegExp[] = [
  // UUIDs: 8-4-4-4-12 hex
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  // Styled Components hashes: sc-dkPtRN, sc-bdfxAY
  /\bsc-[A-Za-z]{4,}\b/g,
  // Emotion CSS-in-JS: css-1x3j7, css-abcDEF
  /\bcss-[A-Za-z0-9]{4,}\b/g,
  // Long lowercase hex strings (8+ consecutive hex chars) — content hashes, fingerprints.
  // Case-sensitive: uppercase text content shouldn't be treated as a hex hash.
  /\b[0-9a-f]{8,}\b/g,
  // Long numeric IDs (5+ consecutive digits) — database IDs, timestamps
  /\b\d{5,}\b/g,
];

/**
 * Strip auto-generated tokens (UUIDs, CSS-in-JS class hashes, long numeric IDs)
 * from a derived string so they never surface in span names or attributes.
 */
export function scrubDynamicSegments(value: string): string {
  let result = value;
  for (const pattern of GENERATED_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Sensitive label keywords that indicate a form input captures PII.
 * Matched case-insensitively against the trimmed text of the associated <label>.
 */
const SENSITIVE_LABEL_PATTERNS: RegExp[] = [
  /\b(password|passcode|pin)\b/i,
  /\b(email|e-mail)\b/i,
  /\b(phone|mobile|cell|tel(ephone)?)\b/i,
  /\b(address|postcode|zip|postal)\b/i,
  /\b(ssn|social.?security|national.?id|tax.?id|nif|dni)\b/i,
  /\b(card.?number|cvv|cvc|expir)/i,
  /\b(date.?of.?birth|dob|birth.?date)\b/i,
  /\b(full.?name|first.?name|last.?name|surname)\b/i,
];

/**
 * Returns true if the text content of a <label> associated with the given
 * element matches any sensitive PII pattern.
 */
export function isLabelSensitive(element: Element): boolean {
  // <label for="inputId">
  const id = element.id;
  if (id) {
    const label = element.ownerDocument?.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
    if (label?.textContent && matchesSensitivePattern(label.textContent)) return true;
  }

  // Wrapping <label> ancestor
  const wrapping = element.closest('label');
  if (wrapping?.textContent && matchesSensitivePattern(wrapping.textContent)) return true;

  // aria-label on the element itself
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && matchesSensitivePattern(ariaLabel)) return true;

  return false;
}

function matchesSensitivePattern(text: string): boolean {
  return SENSITIVE_LABEL_PATTERNS.some((p) => p.test(text));
}
