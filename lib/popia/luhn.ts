/**
 * SA ID number validation — 13 digits, Luhn checksum on the full string.
 * Reference: https://en.wikipedia.org/wiki/South_African_identity_card
 */

export function isValidSaIdNumber(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;

  let sum = 0;
  let alt = false;
  for (let i = id.length - 1; i >= 0; i--) {
    let n = parseInt(id[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
