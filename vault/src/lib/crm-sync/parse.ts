import 'server-only';

// "ID-003" and "ID003" are the same client -- this exists in live data.
export function normalizeClientId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase().replace(/-/g, '');
  return normalized.length > 0 ? normalized : null;
}

// Values seen: EN, GR, FR, and combined forms like "FR/EN". Take the first
// token before "/". Default EN when blank or unrecognised.
export function parseCrmLanguage(raw: string | null | undefined): 'en' | 'fr' | 'el' {
  if (!raw) return 'en';
  const first = raw.split('/')[0]?.trim().toUpperCase();
  if (first === 'FR') return 'fr';
  if (first === 'GR' || first === 'EL') return 'el';
  return 'en';
}

// Three date formats appear in live data: "30/6/2026", "13/05/2026", and
// "2026-07-22". Returns null on anything else -- a null is logged to
// sync_issues by the caller. A misparsed date is worse than a missing one,
// so this never guesses at an ambiguous format.
export function parseCrmDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return isValidDate(Number(year), Number(month), Number(day))
      ? `${year}-${month}-${day}`
      : null;
  }

  const dmyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return isValidDate(Number(year), Number(month), Number(day))
      ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : null;
  }

  return null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// European money string, e.g. "1.612,00 €". Dot is a thousands separator,
// comma is the decimal separator. Never use parseFloat on a raw cell.
//
// No Slice 1 tab or screen carries a money field yet -- this exists ahead
// of Slice 3, written once now so it is already correct when a call site
// appears. It has no caller in Slice 1.
export function parseEuroCents(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const stripped = raw.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
  if (stripped === '') return null;
  const value = Number(stripped);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
