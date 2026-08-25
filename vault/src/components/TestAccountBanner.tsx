// Operator-facing only -- never rendered in /portal, even for the test
// client's own session. A persistent reminder, not a dismissible one.
export function TestAccountBanner() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-amber-900">
      Test account
    </div>
  );
}
