import { isOutsideAthensWorkingHours } from '@/lib/slice2/schedule';
import { NIGHT_BANNER_TEXT, NIGHT_BANNER_URGENT_TEXT } from '@/lib/copy';

// Client-facing only. Never blocks sending -- it sets expectation, nothing
// more. Computed against Europe/Athens regardless of who's viewing it or
// from where.
export function NightBanner() {
  if (!isOutsideAthensWorkingHours()) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p>{NIGHT_BANNER_TEXT}</p>
      <p className="mt-1 text-amber-700">{NIGHT_BANNER_URGENT_TEXT}</p>
    </div>
  );
}
