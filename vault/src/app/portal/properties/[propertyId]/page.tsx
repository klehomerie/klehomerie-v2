import { notFound } from 'next/navigation';
import { requireClient } from '@/lib/portal';
import { DOC_TYPE_LABELS } from '@/lib/copy';
import { getThreadView } from '@/lib/slice2/thread';
import { NightBanner } from '@/components/thread/NightBanner';
import { ThreadPanel } from '@/components/thread/ThreadPanel';
import {
  postClientMessage,
  decideAuthorization,
  toggleReaction,
  editMessage,
  withdrawMessage,
} from './thread-actions';

interface DocumentRow {
  id: string;
  doc_type: string;
  title: string;
  uploaded_at: string;
}

export default async function PortalPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const { supabase, user, client } = await requireClient();

  const { data: property } = await supabase
    .from('properties')
    .select('id, address, prop_ref')
    .eq('id', propertyId)
    .eq('client_id', client.id)
    .single();

  if (!property) {
    notFound();
  }

  const { data: documents } = await supabase
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

  const threadView = await getThreadView(supabase, property.id, user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">{property.address || 'Unknown'}</h1>
      {Array.from(grouped.entries()).map(([docType, docs]) => (
        <div key={docType}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {DOC_TYPE_LABELS[docType] ?? docType}
          </h2>
          <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-900">{doc.title}</span>
                <a
                  href={`/api/documents/${doc.id}/download`}
                  className="text-xs font-medium text-slate-600 hover:underline"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {(documents ?? []).length === 0 && (
        <p className="text-sm text-slate-500">No documents yet.</p>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-slate-900">Thread</h2>
        <NightBanner />
        {threadView ? (
          <ThreadPanel
            view={threadView}
            currentUserId={user.id}
            role="client"
            postMessageAction={postClientMessage.bind(null, property.id, threadView.threadId)}
            decideAction={decideAuthorization.bind(null, property.id, threadView.threadId)}
            toggleReactionAction={toggleReaction.bind(null, property.id)}
            editMessageAction={editMessage.bind(null, property.id)}
            withdrawMessageAction={withdrawMessage.bind(null, property.id)}
          />
        ) : (
          <p className="text-sm text-slate-500">No thread for this asset yet.</p>
        )}
      </section>
    </div>
  );
}
