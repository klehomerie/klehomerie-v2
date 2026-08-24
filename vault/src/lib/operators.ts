import 'server-only';

// Operator identity is a plain email allowlist, not a database flag.
// A sole-trader operation has no team to manage roles for, and keeping the
// check in an env var means no table can be tampered with to grant /admin
// access -- only whoever controls the Netlify environment can.
export function getOperatorEmails(): string[] {
  const raw = process.env.OPERATOR_EMAILS ?? '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getOperatorEmails().includes(email.trim().toLowerCase());
}
