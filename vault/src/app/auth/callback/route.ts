import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOperatorEmail } from '@/lib/operators';

// Exchanges the magic-link code for a session, then routes the visitor to
// /admin or /portal depending on whether they're the operator.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const isOperator = isOperatorEmail(data.user.email);
      if (isOperator) {
        // Mirrors OPERATOR_EMAILS into the operators table so Row Level
        // Security policies (is_operator()) can recognize this session
        // without embedding the email allowlist in SQL. Idempotent.
        await createAdminClient()
          .from('operators')
          .upsert(
            { auth_user_id: data.user.id, email: data.user.email },
            { onConflict: 'auth_user_id' }
          );
      }
      const destination = next || (isOperator ? '/admin' : '/portal');
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
