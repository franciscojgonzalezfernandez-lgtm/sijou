/** Valid GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN) or GTIN-14 with a correct check digit (F-011 CA-2). */
export function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop() as number;
  // From the right, excluding the check digit, weights alternate 3, 1, 3…
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
