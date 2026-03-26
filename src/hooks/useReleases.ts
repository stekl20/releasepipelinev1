import { useState, useEffect, useCallback } from 'react';
import type { Release } from '../types';
import { supabase } from '../lib/supabase';

async function fetchAll(): Promise<Release[]> {
  const { data, error } = await supabase
    .from('releases')
    .select('*')
    .order('date')
    .order('id');
  if (error) throw error;
  return (data ?? []) as Release[];
}

export function useReleases() {
  const [releases, setReleasesState] = useState<Release[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll()
      .then(data => { setReleasesState(data); setLoading(false); })
      .catch(() => { setReleasesState([]); setLoading(false); });

    const channel = supabase
      .channel('releases-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'releases' }, () => {
        fetchAll().then(setReleasesState).catch(() => {});
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const syncReleases = useCallback(async (newReleases: Release[]) => {
    if (newReleases.length === 0) return;
    const { error } = await supabase
      .from('releases')
      .upsert(newReleases, { onConflict: 'id' });
    if (error) throw error;
  }, []);

  const toggleApproved = useCallback(async (id: string) => {
    const release = releases?.find(r => r.id === id);
    if (!release) return;
    await supabase.from('releases').update({ approved: !release.approved }).eq('id', id);
  }, [releases]);

  const toggleDistributed = useCallback(async (id: string) => {
    const release = releases?.find(r => r.id === id);
    if (!release) return;
    const newDistributed = !release.distributed;
    const updates: { distributed: boolean; approved?: boolean } = { distributed: newDistributed };
    // Marking as distributed automatically approves
    if (newDistributed && !release.approved) updates.approved = true;
    await supabase.from('releases').update(updates).eq('id', id);
  }, [releases]);

  const deleteRelease = useCallback(async (id: string) => {
    await supabase.from('releases').delete().eq('id', id);
  }, []);

  const restoreRelease = useCallback(async (release: Release) => {
    await supabase.from('releases').insert(release);
  }, []);

  const updateRelease = useCallback(async (oldId: string, updated: Release) => {
    if (oldId === updated.id) {
      await supabase.from('releases').update(updated).eq('id', oldId);
    } else {
      await supabase.from('releases').insert(updated);
      await supabase.from('releases').delete().eq('id', oldId);
    }
  }, []);

  return {
    releases,
    loading,
    setReleases: syncReleases,
    toggleApproved,
    toggleDistributed,
    deleteRelease,
    restoreRelease,
    updateRelease,
  };
}
