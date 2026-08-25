import Link from 'next/link';
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
    <div className="min-h-screen bg-[var(--bg-color)]">
      <header className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--card-bg)] px-6 py-4">
        <Link href="/admin" className="text-sm font-medium text-[var(--title-color)]">
          Klehomerie Vault - Operator
        </Link>
        <Link href="/admin/briefs" className="text-sm text-[var(--text-color)] hover:underline">
          Briefs awaiting release
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
