import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service role client. Bypasses Row Level Security by design. Used only by
// operator (/admin) server actions and the CRM sync, both of which check
// the operator allowlist themselves before ever calling this. Importing
// this file from a Client Component is a build-time error thanks to
// 'server-only' -- do not work around that.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
