import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { SyncButton } from './sync-button';
import { InviteButton } from './invite-button';

export default async function AdminPage() {
  const admin = createAdminClient();

  const { data: clients } = await admin
    .from('clients')
    .select('id, name, email, auth_user_id, is_test_account')
    .order('name');

  const { data: properties } = await admin
    .from('properties')
    .select('id, prop_ref, address, is_active, client_id')
    .order('address');

  const clientsById = new Map((clients ?? []).map((client) => [client.id, client]));

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold text-[var(--title-color)]">Assets</h1>
        <p className="mt-1 text-sm text-[var(--text-color)]">
          Mirrored from the CRM. Run a sync to bring in the latest changes.
        </p>
        <div className="mt-4">
          <SyncButton />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--title-color)]">Properties</h2>
        <ul className="mt-3 divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
          {(properties ?? []).map((property) => {
            const client = clientsById.get(property.client_id);
            return (
              <li key={property.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/admin/properties/${property.id}`}
                    className="text-sm font-medium text-[var(--title-color)] hover:underline"
                  >
                    {property.address || 'Unknown'}
                  </Link>
                  <p className="text-xs text-[var(--text-color)]">
                    {client?.name ?? 'Unknown'} - {property.prop_ref}
                    {!property.is_active && ' - inactive in CRM'}
                  </p>
                </div>
              </li>
            );
          })}
          {(properties ?? []).length === 0 && (
            <li className="px-4 py-6 text-sm text-[var(--text-color)]">
              No assets yet. Run a CRM sync to import them.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--title-color)]">Clients</h2>
        <ul className="mt-3 divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
          {(clients ?? []).map((client) => (
            <li key={client.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--title-color)]">
                  {client.name}
                  {client.is_test_account && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                      Test account
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-color)]">{client.email}</p>
              </div>
              <InviteButton clientId={client.id} hasAccess={Boolean(client.auth_user_id)} />
            </li>
          ))}
          {(clients ?? []).length === 0 && (
            <li className="px-4 py-6 text-sm text-[var(--text-color)]">
              No clients yet. Run a CRM sync to import them.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
