import Link from 'next/link';
import { requireClient } from '@/lib/portal';

export default async function PortalPage() {
  const { supabase, client } = await requireClient();

  const { data: properties } = await supabase
    .from('properties')
    .select('id, address, prop_ref')
    .eq('client_id', client.id)
    .order('address');

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--title-color)]">Your assets</h1>
      <ul className="mt-4 divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
        {(properties ?? []).map((property) => (
          <li key={property.id} className="px-4 py-3">
            <Link
              href={`/portal/properties/${property.id}`}
              className="text-sm font-medium text-[var(--title-color)] hover:underline"
            >
              {property.address || 'Unknown'}
            </Link>
          </li>
        ))}
        {(properties ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-[var(--text-color)]">
            Nothing on file yet. Once Klehomerie is set up on your property, it will appear here.
          </li>
        )}
      </ul>
    </div>
  );
}
