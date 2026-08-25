import { ReactionBar } from './ReactionBar';
import { MessageActions } from './MessageActions';
import { AuthorizationCard } from './AuthorizationCard';
import { MessageComposer } from './MessageComposer';
import type { ThreadView } from '@/lib/slice2/thread';
import type { MutationResult } from '@/lib/slice2/mutations';
import type { DecisionResult } from '@/app/portal/properties/[propertyId]/thread-actions';

interface ThreadPanelProps {
  view: ThreadView;
  currentUserId: string;
  role: 'operator' | 'client';
  postMessageAction: (formData: FormData) => Promise<MutationResult>;
  toggleReactionAction: (messageId: string, emoji: string) => Promise<MutationResult>;
  editMessageAction: (messageId: string, body: string) => Promise<MutationResult>;
  withdrawMessageAction: (messageId: string) => Promise<MutationResult>;
  decideAction?: (itemId: string, decision: 'approved' | 'declined') => Promise<DecisionResult>;
}

function roleLabel(role: 'operator' | 'client' | 'system'): string {
  if (role === 'operator') return 'Klehomerie';
  if (role === 'system') return 'System';
  return 'Client';
}

export function ThreadPanel({
  view,
  currentUserId,
  role,
  postMessageAction,
  toggleReactionAction,
  editMessageAction,
  withdrawMessageAction,
  decideAction,
}: ThreadPanelProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
        {view.messages.length === 0 && (
          <p className="text-sm text-[var(--text-color)]">
            {role === 'client'
              ? 'Nothing here yet. Klehomerie is watching over this asset. Updates, documents, and any authorization requests will appear in this thread.'
              : 'No activity yet on this asset. A message or an authorization raised here reaches the client directly.'}
          </p>
        )}

        {view.messages.map((message) => {
          if (message.deleted_at) {
            return (
              <p key={message.id} className="text-sm italic text-[var(--text-color)]">
                Message withdrawn
              </p>
            );
          }

          if (message.author_role === 'system') {
            return (
              <p key={message.id} className="text-center text-xs text-[var(--text-color)]">
                {message.body} · {new Date(message.created_at).toLocaleString()}
              </p>
            );
          }

          const isAuthorizationCard = message.ref_type === 'authorization' && Boolean(message.ref_id);
          const authorization = isAuthorizationCard
            ? view.authorizationsByItemId.get(message.ref_id as string)
            : undefined;
          const isOwn = message.author_id === currentUserId;

          if (isAuthorizationCard) {
            return (
              <div key={message.id}>
                <p className="text-xs font-medium text-[var(--text-color)]">
                  {roleLabel(message.author_role)} · {new Date(message.created_at).toLocaleString()}
                </p>
                <div className="mt-1">
                  {authorization ? (
                    <AuthorizationCard
                      authorization={authorization}
                      document={
                        authorization.doc_id
                          ? {
                              id: authorization.doc_id,
                              title: view.documentTitlesById.get(authorization.doc_id) ?? 'Document',
                            }
                          : null
                      }
                      canDecide={role === 'client'}
                      onDecide={decideAction}
                    />
                  ) : (
                    <p className="text-sm text-[var(--text-color)]">Authorization unavailable.</p>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                <p
                  className={`text-xs font-medium text-[var(--text-color)] ${isOwn ? 'text-right' : 'text-left'}`}
                >
                  {roleLabel(message.author_role)} · {new Date(message.created_at).toLocaleString()}
                </p>
                <div
                  className={`mt-0.5 rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    isOwn ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--secondary-bg)] text-[var(--title-color)]'
                  }`}
                >
                  {message.body}
                </div>
                <ReactionBar
                  messageId={message.id}
                  reactions={view.reactionsByMessageId.get(message.id) ?? []}
                  onToggle={toggleReactionAction}
                />
                {isOwn && (
                  <MessageActions
                    messageId={message.id}
                    body={message.body ?? ''}
                    createdAt={message.created_at}
                    onEdit={editMessageAction}
                    onWithdraw={withdrawMessageAction}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <MessageComposer action={postMessageAction} />
    </div>
  );
}
