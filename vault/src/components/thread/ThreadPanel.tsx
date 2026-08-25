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
      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
        {view.messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}

        {view.messages.map((message) => {
          if (message.deleted_at) {
            return (
              <p key={message.id} className="text-sm italic text-slate-400">
                Message withdrawn
              </p>
            );
          }

          if (message.author_role === 'system') {
            return (
              <p key={message.id} className="text-center text-xs text-slate-400">
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
                <p className="text-xs font-medium text-slate-500">
                  {roleLabel(message.author_role)} · {new Date(message.created_at).toLocaleString()}
                </p>
                <div className="mt-1">
                  {authorization ? (
                    <AuthorizationCard
                      authorization={authorization}
                      documentTitle={
                        authorization.doc_id
                          ? (view.documentTitlesById.get(authorization.doc_id) ?? null)
                          : null
                      }
                      canDecide={role === 'client'}
                      onDecide={decideAction}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">Authorization unavailable.</p>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                <p
                  className={`text-xs font-medium text-slate-500 ${isOwn ? 'text-right' : 'text-left'}`}
                >
                  {roleLabel(message.author_role)} · {new Date(message.created_at).toLocaleString()}
                </p>
                <div
                  className={`mt-0.5 rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                    isOwn ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
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
