import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

export function useRealtimeStatus() {
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'

  useEffect(() => {
    if (!isConfigured || !supabase) { setStatus('error'); return; }

    const channel = supabase
      .channel('admin-health-check')
      .subscribe(s => {
        if (s === 'SUBSCRIBED')    setStatus('connected');
        if (s === 'CHANNEL_ERROR') setStatus('error');
        if (s === 'CLOSED')        setStatus('error');
      });

    return () => supabase.removeChannel(channel);
  }, []);

  return status;
}
