import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { DOC_TYPE_LABELS } from '@/lib/copy';
import { uploadDocument } from '../../actions';
import { UploadForm } from './upload-form';
import { getThreadView } from '@/lib/slice2/thread';
import { ThreadPanel } from '@/components/thread/ThreadPanel';
import { PropertyLiveRefresh } from '@/components/PropertyLiveRefresh';
import { CreateAuthorizationForm } from './create-authorization-form';
import {
  postOperatorMessage,
  createAuthorization,
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

  const {
    data: { user: operator },
  } = await (await createServerClient()).auth.getUser();
  const threadView = operator ? await getThreadView(admin, property.id, operator.id) : null;

  return (
    <div className="space-y-6">
      {/* Collapsed header -- the thread below is the screen, this is just
          orientation, not a competing block of stacked fields. */}
      <header>
        <h1 className="text-xl font-semibold text-[var(--title-color)]">{property.address || 'Unknown'}</h1>
        <p className="text-xs text-[var(--text-color)]">
          {clientName ?? 'Unknown'} - {property.prop_ref}
        </p>
      </header>

      <details className="group rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--title-color)]">
          Documents
          <span className="float-right text-[var(--text-color)] group-open:rotate-180">⌄</span>
        </summary>
        <div className="space-y-4 border-t border-[var(--border-color)] px-4 py-4">
          {Array.from(grouped.entries()).map(([docType, docs]) => (
            <div key={docType}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-color)]">
                {DOC_TYPE_LABELS[docType] ?? docType}
              </h2>
              <ul className="mt-2 divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)]">
                {docs.map((doc) => (
                  <li key={doc.id} className="px-4 py-3 text-sm text-[var(--title-color)]">
                    {doc.title}
                    <span className="ml-2 text-xs text-[var(--text-color)]">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {(documents ?? []).length === 0 && (
            <p className="text-sm text-[var(--text-color)]">No documents filed yet for this asset.</p>
          )}
          <UploadForm propertyId={property.id} action={uploadDocument} />
        </div>
      </details>

      {threadView && operator && (
        <details className="group rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--title-color)]">
            Raise an authorization
            <span className="float-right text-[var(--text-color)] group-open:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-[var(--border-color)] p-4">
            <CreateAuthorizationForm
              documents={(documents ?? []).map((doc) => ({ id: doc.id, title: doc.title }))}
              action={createAuthorization.bind(null, property.id, threadView.threadId)}
            />
          </div>
        </details>
      )}

      {threadView && operator ? (
        <>
          <PropertyLiveRefresh propertyId={property.id} threadId={threadView.threadId} />
          <ThreadPanel
            view={threadView}
            currentUserId={operator.id}
            role="operator"
            postMessageAction={postOperatorMessage.bind(null, property.id, threadView.threadId)}
            toggleReactionAction={toggleReaction.bind(null, property.id)}
            editMessageAction={editMessage.bind(null, property.id)}
            withdrawMessageAction={withdrawMessage.bind(null, property.id)}
          />
        </>
      ) : (
        <p className="text-sm text-[var(--text-color)]">No thread for this asset yet.</p>
      )}
    </div>
  );
}
