// Working hours: Monday to Saturday, 08:00 to 20:00 Europe/Athens. Computed
// against Europe/Athens regardless of the visitor's own timezone -- the
// client in Tel Aviv and the client in Lisbon see the banner at the same
// moment. No stored timezone per user, no configuration table -- constants
// here, per the project instructions.
const WORKING_HOUR_START = 8;
const WORKING_HOUR_END = 20;

export function isOutsideAthensWorkingHours(now: Date = new Date()): boolean {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);

  if (weekday === 'Sun') return true;
  return hour < WORKING_HOUR_START || hour >= WORKING_HOUR_END;
}
