import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { CreditRow } from '../types';

type CreditsMap = Record<string, CreditRow>;

export function useCredits() {
  const [credits, setCredits] = useState<CreditsMap>({});

  useEffect(() => {
    supabase.from('credits').select('*').then(({ data }) => {
      if (data) {
        const map: CreditsMap = {};
        for (const row of data) map[row.release_id] = row;
        setCredits(map);
      }
    });

    const channel = supabase
      .channel('credits-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credits' }, payload => {
        if (payload.eventType === 'DELETE') {
          setCredits(prev => {
            const next = { ...prev };
            delete next[(payload.old as CreditRow).release_id];
            return next;
          });
        } else {
          const row = payload.new as CreditRow;
          setCredits(prev => ({ ...prev, [row.release_id]: row }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function upsertCredit(releaseId: string, fields: Partial<Omit<CreditRow, 'id' | 'release_id'>>) {
    const existing = credits[releaseId] ?? {};
    const updated: CreditRow = { ...existing, release_id: releaseId, ...fields };
    // Optimistic update
    setCredits(prev => ({ ...prev, [releaseId]: updated }));
    await supabase.from('credits').upsert({ ...updated }, { onConflict: 'release_id' });
  }

  return { credits, upsertCredit };
}
