'use server';

import { createClient } from '@/lib/supabase/server';

export interface RequestLinkState {
  ok: boolean;
  message: string;
}

// Magic link only, per project instructions -- no passwords, anywhere.
// shouldCreateUser is false: a Supabase auth user only ever comes from the
// operator invite flow, so a stranger typing a random email here cannot
// create an account for themselves.
export async function requestMagicLink(
  _prevState: RequestLinkState,
  formData: FormData
): Promise<RequestLinkState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) {
    return { ok: false, message: 'Enter your email address.' };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
    },
  });

  if (error) {
    return { ok: false, message: 'Could not send the link. Try again in a moment.' };
  }

  return { ok: true, message: 'Check your email for a sign-in link.' };
}
