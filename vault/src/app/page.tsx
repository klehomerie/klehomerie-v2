import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isOperatorEmail } from '@/lib/operators';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  redirect(isOperatorEmail(user.email) ? '/admin' : '/portal');
}
