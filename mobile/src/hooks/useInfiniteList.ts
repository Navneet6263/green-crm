import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Page } from '../api/types';
import { createPagedList, emptyList, type ListState } from './pagedList';

export function useInfiniteList<T>(key: string, load: (page: number) => Promise<Page<T>>, id: (item: T) => string) {
  const loader = useRef(load); loader.current = load;
  const identify = useRef(id); identify.current = id;
  const [result, setResult] = useState<{ key: string; state: ListState<T> }>({ key, state: emptyList<T>() });
  const pager = useMemo(() => createPagedList<T>(page => loader.current(page), item => identify.current(item), state => setResult({ key, state })), [key]);
  useFocusEffect(useCallback(() => { void pager.reset(); return pager.cancel; }, [pager]));
  return { ...(result.key === key ? result.state : emptyList<T>()), reload: () => void pager.reset(), loadMore: () => void pager.more() };
}
