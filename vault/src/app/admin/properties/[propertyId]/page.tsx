import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { DOC_TYPE_LABELS } from '@/lib/copy';
import { uploadDocument } from '../../actions';
import { UploadForm } from './upload-form';

interface DocumentRow {
  id: string;
  doc_type: string;
  title: string;
  uploaded_at: string;
}

export default async function AdminPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const admin = createAdminClient();

  const { data: property } = await admin
    .from('properties')
    .select('id, address, prop_ref, client_id, clients(name)')
    .eq('id', propertyId)
    .single();

  if (!property) {
    notFound();
  }

  const { data: documents } = await admin
    .from('documents')
    .select('id, doc_type, title, uploaded_at')
    .eq('property_id', propertyId)
    .order('uploaded_at', { ascending: false });

  const grouped = new Map<string, DocumentRow[]>();
  for (const doc of (documents ?? []) as DocumentRow[]) {
    const list = grouped.get(doc.doc_type) ?? [];
    list.push(doc);
    grouped.set(doc.doc_type, list);
  }

  const clientName = (property as { clients?: { name?: string } | null }).clients?.name;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{property.address || 'Unknown'}</h1>
        <p className="text-sm text-slate-500">
          {clientName ?? 'Unknown'} - {property.prop_ref}
        </p>
      </div>

      <UploadForm propertyId={property.id} action={uploadDocument} />

      <section className="space-y-6">
        {Array.from(grouped.entries()).map(([docType, docs]) => (
          <div key={docType}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {DOC_TYPE_LABELS[docType] ?? docType}
            </h2>
            <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
              {docs.map((doc) => (
                <li key={doc.id} className="px-4 py-3 text-sm text-slate-900">
                  {doc.title}
                  <span className="ml-2 text-xs text-slate-400">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {(documents ?? []).length === 0 && (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        )}
      </section>
    </div>
  );
}
