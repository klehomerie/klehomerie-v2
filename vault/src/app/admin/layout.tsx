import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isOperatorEmail } from '@/lib/operators';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isOperatorEmail(user.email)) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <p className="text-sm font-medium text-slate-500">Klehomerie Vault - Operator</p>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
