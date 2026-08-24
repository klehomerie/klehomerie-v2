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
      <h1 className="text-xl font-semibold text-slate-900">Your assets</h1>
      <ul className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
        {(properties ?? []).map((property) => (
          <li key={property.id} className="px-4 py-3">
            <Link
              href={`/portal/properties/${property.id}`}
              className="text-sm font-medium text-slate-900 hover:underline"
            >
              {property.address || 'Unknown'}
            </Link>
          </li>
        ))}
        {(properties ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-slate-500">No assets on file yet.</li>
        )}
      </ul>
    </div>
  );
}
