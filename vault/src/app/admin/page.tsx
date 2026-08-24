import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { SyncButton } from './sync-button';
import { InviteButton } from './invite-button';

export default async function AdminPage() {
  const admin = createAdminClient();

  const { data: clients } = await admin
    .from('clients')
    .select('id, name, email, auth_user_id')
    .order('name');

  const { data: properties } = await admin
    .from('properties')
    .select('id, prop_ref, address, is_active, client_id')
    .order('address');

  const clientsById = new Map((clients ?? []).map((client) => [client.id, client]));

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold text-slate-900">Assets</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mirrored from the CRM. Run a sync to bring in the latest changes.
        </p>
        <div className="mt-4">
          <SyncButton />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Properties</h2>
        <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {(properties ?? []).map((property) => {
            const client = clientsById.get(property.client_id);
            return (
              <li key={property.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/admin/properties/${property.id}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    {property.address || 'Unknown'}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {client?.name ?? 'Unknown'} - {property.prop_ref}
                    {!property.is_active && ' - inactive in CRM'}
                  </p>
                </div>
              </li>
            );
          })}
          {(properties ?? []).length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-500">
              No assets yet. Run a CRM sync to import them.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Clients</h2>
        <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {(clients ?? []).map((client) => (
            <li key={client.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{client.name}</p>
                <p className="text-xs text-slate-500">{client.email}</p>
              </div>
              <InviteButton clientId={client.id} hasAccess={Boolean(client.auth_user_id)} />
            </li>
          ))}
          {(clients ?? []).length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-500">
              No clients yet. Run a CRM sync to import them.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
