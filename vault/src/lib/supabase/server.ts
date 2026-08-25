import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// User-scoped Supabase client, bound to the visitor's session cookie.
// Every query through this client is filtered by Row Level Security.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render, where cookies can't be
            // written. proxy.ts refreshes the session cookie on the request
            // that follows, so this is safe to ignore here.
          }
        },
      },
    }
  );
}
