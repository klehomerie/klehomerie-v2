import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UNKNOWN } from '@/lib/copy';

// Centralizes "who is the signed-in client" for every /portal page, so the
// auth + ownership check lives in one place rather than being repeated (and
// potentially forgotten) per route.
export async function requireClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, language')
    .eq('auth_user_id', user.id)
    .single();

  if (!client) {
    redirect('/login');
  }

  return {
    supabase,
    user,
    client: { ...client, name: client.name || UNKNOWN },
  };
}
