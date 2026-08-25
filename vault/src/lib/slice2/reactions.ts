// Fixed reaction set, no picker. Shared between server-only code
// (thread.ts, mutations.ts) and client components (ReactionBar) -- this
// file deliberately has no 'server-only' import so both can use it.
export const AVAILABLE_REACTIONS = ['👍', '✅', '👀', '❓', '⚠️'] as const;

export interface ReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}
