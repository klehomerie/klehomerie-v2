import { notFound } from 'next/navigation';
import { requireClient } from '@/lib/portal';
import { DOC_TYPE_LABELS } from '@/lib/copy';
import { getThreadView } from '@/lib/slice2/thread';
import { NightBanner } from '@/components/thread/NightBanner';
import { ThreadPanel } from '@/components/thread/ThreadPanel';
import { PropertyLiveRefresh } from '@/components/PropertyLiveRefresh';
import {
  postClientMessage,
  decideAuthorization,
  toggleReaction,
  editMessage,
  withdrawMessage,
} from './thread-actions';
import { uploadClientDocument } from './document-actions';
import { ClientUploadForm } from './client-upload-form';
import { DocumentBriefPanel } from '@/components/DocumentBriefPanel';

interface DocumentRow {
  id: string;
  doc_type: string;
  title: string;
  uploaded_at: string;
  brief_generation_status: string | null;
}

interface BriefRow {
  document_id: string;
  language: string;
  body: string;
  edited_body: string | null;
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
    .select('id, doc_type, title, uploaded_at, brief_generation_status')
    .eq('property_id', propertyId)
    .order('uploaded_at', { ascending: false });

  const grouped = new Map<string, DocumentRow[]>();
  for (const doc of (documents ?? []) as DocumentRow[]) {
    const list = grouped.get(doc.doc_type) ?? [];
    list.push(doc);
    grouped.set(doc.doc_type, list);
  }

  // RLS on document_briefs already returns released rows only for a
  // client session -- nothing extra to filter here.
  const documentIds = (documents ?? []).map((doc) => doc.id);
  const { data: briefRows } =
    documentIds.length > 0
      ? await supabase
          .from('document_briefs')
          .select('document_id, language, body, edited_body')
          .in('document_id', documentIds)
      : { data: [] as BriefRow[] };
  const briefsByDocumentId = new Map((briefRows ?? []).map((row) => [row.document_id, row as BriefRow]));

  const threadView = await getThreadView(supabase, property.id, user.id);

  return (
    <div className="space-y-6">
      {/* Collapsed header -- the thread below is the screen, this is just
          orientation, not a competing block of stacked fields. */}
      <header>
        <h1 className="text-xl font-semibold text-[var(--title-color)]">{property.address || 'Unknown'}</h1>
        <p className="text-xs text-[var(--text-color)]">{property.prop_ref}</p>
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
                {docs.map((doc) => {
                  const brief = briefsByDocumentId.get(doc.id);
                  return (
                    <li key={doc.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--title-color)]">{doc.title}</span>
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          className="text-xs font-medium text-[var(--text-color)] hover:underline"
                        >
                          Download
                        </a>
                      </div>
                      <DocumentBriefPanel
                        briefGenerationStatus={doc.brief_generation_status}
                        brief={
                          brief
                            ? { body: brief.body, editedBody: brief.edited_body, language: brief.language }
                            : null
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {(documents ?? []).length === 0 && (
            <p className="text-sm text-[var(--text-color)]">No documents filed yet for this asset.</p>
          )}
          <ClientUploadForm action={uploadClientDocument.bind(null, property.id)} />
        </div>
      </details>

      <NightBanner />
      {threadView ? (
        <>
          <PropertyLiveRefresh propertyId={property.id} threadId={threadView.threadId} />
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
        </>
      ) : (
        <p className="text-sm text-[var(--text-color)]">
          Nothing here yet. Klehomerie is watching over this asset. Updates, documents, and any
          authorization requests will appear in this thread.
        </p>
      )}
    </div>
  );
}
