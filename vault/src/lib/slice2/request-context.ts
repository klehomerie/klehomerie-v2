import 'server-only';

import { headers } from 'next/headers';

// Captures decided_ip / decided_user_agent from the request itself, never
// from client-supplied form data -- these exist as authorization evidence,
// so they must come from something the caller can't fabricate.
export async function getDecisionContext() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
  const userAgent = requestHeaders.get('user-agent');
  return { ip, userAgent };
}
