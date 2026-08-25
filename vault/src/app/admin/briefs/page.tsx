import { createAdminClient } from '@/lib/supabase/admin';
import { loadDraftBriefs, extractSourceTextFromDrive } from '@/lib/slice3/queue';
import { BriefQueueList } from './brief-queue-list';

export default async function BriefsQueuePage() {
  const admin = createAdminClient();
  const drafts = await loadDraftBriefs(admin);

  const rows = await Promise.all(
    drafts.map(async (draft) => {
      if (!draft.drive_file_id) {
        return { draft, sourceText: null, hashMatches: false };
      }
      const source = await extractSourceTextFromDrive(draft.drive_file_id, draft.source_text_sha256);
      return { draft, sourceText: source.text, hashMatches: source.hashMatches };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--title-color)]">Briefs awaiting release</h1>
        <p className="mt-1 text-sm text-[var(--text-color)]">
          A brief stays invisible to the client until you release it here.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-color)]">
          Nothing waiting. Every generated brief has been reviewed.
        </p>
      ) : (
        <BriefQueueList rows={rows} />
      )}
    </div>
  );
}
