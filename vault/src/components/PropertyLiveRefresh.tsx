'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Keeps a property page (thread + documents) live without polling:
// subscribes to Postgres changes on the rows that page renders and asks
// Next.js to re-fetch server data whenever one arrives. Realtime respects
// the same RLS policies as any other query, so a client's subscription
// only ever fires for rows they could already read -- see 0006's comment.
//
// reactions has no thread_id/property_id column to filter on (it only
// ties back to a message), so that one listener is unfiltered and can
// trigger a refresh from another thread's activity. Harmless -- the
// re-fetch is still scoped correctly by RLS -- just occasionally
// redundant. Not worth a broadcast-channel redesign at this scale.
export function PropertyLiveRefresh({
  propertyId,
  threadId,
}: {
  propertyId: string;
  threadId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`property-${propertyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'authorizations', filter: `thread_id=eq.${threadId}` },
        () => router.refresh()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () =>
        router.refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `property_id=eq.${propertyId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId, threadId, router]);

  return null;
}
