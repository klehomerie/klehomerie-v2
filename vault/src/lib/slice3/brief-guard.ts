// Post-processing guard: a prompt instruction is not a control, this
// regex is. Rejects any brief containing a currency symbol next to a
// number, a percentage, or a number next to a currency word -- in any of
// the three languages the brief might be written in.
const MONEY_PATTERN =
  /[€$£¥]\s?\d[\d.,]*|\d[\d.,]*\s?[€$£¥]|\d+(?:[.,]\d+)?\s?%|\b\d[\d.,]*\s?(?:eur|usd|gbp|euros?|dollars?)\b|\b(?:eur|usd|gbp|euros?|dollars?)\s?\d[\d.,]*\b/i;

export function containsMoneyPattern(text: string): boolean {
  return MONEY_PATTERN.test(text);
}
