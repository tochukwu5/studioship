/**
 * Secret masking.
 * Shows the first 6 and last 4 chars, replaces the middle with …
 * e.g. 0xac0974bec39a17e36ba4a6b4d238ff944bacb478a3f26561fcf347105519f24
 *   -> 0xac09…519f
 *
 * Safe to call on any string — if the string is shorter than 12 chars it
 * returns it unchanged (no meaningful info to hide).
 */
export function maskSecret(value: string): string {
  if (value.length < 12) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

/**
 * Replace any key-like value in a code snippet with a masked version.
 * Looks for 64-hex strings (with or without 0x prefix) and 12/24-word mnemonics.
 */
export function maskSnippet(snippet: string): string {
  // 64-char hex (optional 0x prefix) — private key pattern
  const maskedHex = snippet.replace(
    /\b(0x)?[0-9a-fA-F]{64}\b/g,
    (m) => maskSecret(m),
  )
  // 12 or 24 word mnemonic patterns — replace word sequence
  const maskedMnemonic = maskedHex.replace(
    /\b((?:[a-z]+\s+){11}[a-z]+|(?:[a-z]+\s+){23}[a-z]+)\b/gi,
    (m) => `${m.split(' ').slice(0, 2).join(' ')} … [mnemonic masked]`,
  )
  return maskedMnemonic
}
