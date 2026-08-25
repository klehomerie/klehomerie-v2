import { briefSummaryLabel, NO_TEXT_LAYER_LABEL } from '@/lib/copy';

// Original document is primary and shown first (by the caller, above this
// component). This is the visually secondary panel beneath it. Absent
// entirely when there's no released brief and no_text_layer isn't the
// reason -- not greyed out, not "pending".
export function DocumentBriefPanel({
  briefGenerationStatus,
  brief,
}: {
  briefGenerationStatus: string | null;
  brief: { body: string; editedBody: string | null; language: string } | null;
}) {
  if (brief) {
    return (
      <div className="mt-1 rounded-lg bg-[var(--bg-color)] p-3">
        <p className="text-xs font-medium text-[var(--text-color)]">{briefSummaryLabel(brief.language)}</p>
        <p className="mt-1 text-sm text-[var(--text-color)]">{brief.editedBody ?? brief.body}</p>
      </div>
    );
  }

  if (briefGenerationStatus === 'no_text_layer') {
    return <p className="mt-1 text-xs text-[var(--text-color)]">{NO_TEXT_LAYER_LABEL}</p>;
  }

  return null;
}
