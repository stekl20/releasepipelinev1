import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ActConfig {
  act: string;
  cadence: number;
  retired: boolean;
}

type ActConfigMap = Record<string, ActConfig>;

export function useActConfig() {
  const [actConfig, setActConfig] = useState<ActConfigMap>({});

  useEffect(() => {
    supabase.from('act_config').select('*').then(({ data }) => {
      if (data) {
        const map: ActConfigMap = {};
        for (const row of data) map[row.act] = row;
        setActConfig(map);
      }
    });

    const channel = supabase
      .channel('act_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'act_config' }, payload => {
        if (payload.eventType === 'DELETE') {
          setActConfig(prev => {
            const next = { ...prev };
            delete next[(payload.old as ActConfig).act];
            return next;
          });
        } else {
          const row = payload.new as ActConfig;
          setActConfig(prev => ({ ...prev, [row.act]: row }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  function getCadence(act: string): number {
    const key = act.toLowerCase().trim();
    return actConfig[key]?.cadence ?? 14;
  }

  async function setCadence(act: string, cadence: number) {
    const key = act.toLowerCase().trim();
    await supabase.from('act_config').upsert({ act: key, cadence, retired: actConfig[key]?.retired ?? false });
  }

  async function setRetired(act: string, retired: boolean) {
    const key = act.toLowerCase().trim();
    await supabase.from('act_config').upsert({ act: key, cadence: actConfig[key]?.cadence ?? 14, retired });
  }

  return { actConfig, getCadence, setCadence, setRetired };
}
