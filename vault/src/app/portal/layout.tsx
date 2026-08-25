import { requireClient } from '@/lib/portal';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { client } = await requireClient();

  return (
    <div className="min-h-screen bg-[var(--bg-color)]">
      <header className="border-b border-[var(--border-color)] bg-[var(--card-bg)] px-6 py-4">
        <p className="text-sm font-medium text-[var(--text-color)]">Klehomerie Vault</p>
        <p className="text-xs text-[var(--text-color)]">{client.name}</p>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
