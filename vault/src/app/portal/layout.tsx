import { requireClient } from '@/lib/portal';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { client } = await requireClient();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <p className="text-sm font-medium text-slate-500">Klehomerie Vault</p>
        <p className="text-xs text-slate-400">{client.name}</p>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
