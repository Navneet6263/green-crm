import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export function useResource<T>(key: string, load: () => Promise<T>) {
  const loader = useRef(load); loader.current = load;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: T; error: string; loading: boolean }>({ key, error: '', loading: true });
  useFocusEffect(useCallback(() => {
    let active = true;
    setResult({ key, error: '', loading: true });
    loader.current().then(data => { if (active) setResult({ key, data, error: '', loading: false }); })
      .catch(error => { if (active) setResult({ key, error: error instanceof Error ? error.message : 'Could not load this page.', loading: false }); });
    return () => { active = false; };
  }, [key, revision]));
  return { ...(result.key === key ? result : { data: undefined, error: '', loading: true }), reload: () => setRevision(n => n + 1) };
}
