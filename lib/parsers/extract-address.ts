/**
 * Extract property address from CoCT bill text.
 *
 * CoCT bills have a predictable header layout:
 *   Computer generated copy tax invoice\tJASON THWAITS & PAULINA GONCALVES
 *   11 WATSON WALK
 *   7945
 *   TOKAI
 *
 * The address is after the account holder name line and before "Page" or "Civic Centre".
 * We extract lines between the name and "Page" marker, then join them.
 *
 * This is a deterministic extraction — no Claude involved.
 */

/**
 * Extract property address from a CoCT bill's raw text.
 *
 * @param billText  The full OCR/PDF-extracted text from a CoCT bill
 * @returns The property address string, or empty string if not found
 */
export function extractAddressFromCoctBill(billText: string): string {
  if (!billText) return '';

  // Strategy 1: Look for text between "copy tax invoice\t<NAME>" block and "Page" marker.
  // The name appears after "copy tax invoice" tab, then address lines follow.
  const invoiceNameMatch = billText.match(
    /Computer generated copy tax invoice\t([^\n]+)\n([\s\S]*?)(?=\nPage\b)/i
  );

  if (invoiceNameMatch) {
    const addressBlock = invoiceNameMatch[2].trim();
    const lines = addressBlock
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length > 0) {
      // The address block typically has: street, postal code, suburb
      // e.g. "11 WATSON WALK", "7945", "TOKAI"
      return lines.join(', ');
    }
  }

  // Strategy 2: Fallback — look for a street-number-style line near the top of the bill
  // CoCT bills always have the address in the first ~30 lines
  const topLines = billText.split('\n').slice(0, 40);
  for (let i = 0; i < topLines.length; i++) {
    const line = topLines[i].trim();
    // Match common SA street address patterns: "11 WATSON WALK" or "23A MAIN ROAD"
    if (/^\d+[A-Z]?\s+[A-Z]/.test(line)) {
      // Collect subsequent lines that look like suburb/postal code
      const addressParts = [line];
      for (let j = i + 1; j < Math.min(i + 3, topLines.length); j++) {
        const next = topLines[j].trim();
        // Postal code (4 digits) or suburb name (ALL CAPS word)
        if (/^\d{4}$/.test(next) || /^[A-Z][A-Z\s]+$/.test(next)) {
          addressParts.push(next);
        } else {
          break;
        }
      }
      if (addressParts.length >= 2) {
        return addressParts.join(', ');
      }
    }
  }

  return '';
}
