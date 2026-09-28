import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Session } from '../api/types';
import type { TrackState } from './types';
import { nativeTracking, trackingState } from './engine';

export function useTracker(session: Session | null) {
  const [state, setState] = useState<TrackState>();
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const focused = useRef(false), locked = useRef(false), sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!session || !nativeTracking) return;
    const request = ++sequence.current;
    try {
      const next = await trackingState(session);
      if (focused.current && request === sequence.current) { setState(next); setLoadError(''); }
    } catch (failure) {
      if (focused.current && request === sequence.current) setLoadError((failure as Error).message);
    } finally { if (focused.current && request === sequence.current) setLoading(false); }
  }, [session]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    setBusy(locked.current);
    const update = () => { if (!locked.current && AppState.currentState === 'active') void refresh(); };
    update();
    const timer = setInterval(update, 5000);
    const app = AppState.addEventListener('change', value => { if (value === 'active') update(); });
    return () => { focused.current = false; sequence.current++; clearInterval(timer); app.remove(); };
  }, [refresh]));
  const run = async (action: () => Promise<unknown>, success = '') => {
    if (locked.current) return;
    locked.current = true; sequence.current++; setBusy(true); setError(''); setNotice('');
    try { await action(); if (focused.current) setNotice(success); }
    catch (failure) { if (focused.current) setError((failure as Error).message); }
    finally {
      await refresh(); locked.current = false;
      if (focused.current) setBusy(false);
    }
  };
  return { state, error: error || loadError, notice, loading, busy, run, refresh, setError };
}
