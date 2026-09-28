import type { Page } from '../api/types';
export type ListState<T> = { items: T[]; page: number; total: number; hasMore: boolean; loading: boolean; moreLoading: boolean; error: string };
export const emptyList = <T>(): ListState<T> => ({ items: [], page: 0, total: 0, hasMore: true, loading: true, moreLoading: false, error: '' });

export function createPagedList<T>(load: (page: number) => Promise<Page<T>>, id: (item: T) => string, notify: (state: ListState<T>) => void) {
  let state = emptyList<T>(), generation = 0, busy = false;
  const emit = (next: ListState<T>) => { state = next; notify(state); };
  async function fetchPage(reset = false) {
    if (!reset && (busy || !state.hasMore)) return;
    if (reset) { generation++; busy = false; state = emptyList<T>(); }
    const request = generation, page = reset ? 1 : state.page + 1;
    busy = true; emit({ ...state, error: '', loading: page === 1, moreLoading: page > 1 });
    try {
      const result = await load(page);
      if (request !== generation) return;
      const previous = reset ? [] : state.items;
      const merged = new Map(previous.map(item => [id(item), item]));
      for (const item of result.items) merged.set(id(item), item);
      emit({ items: [...merged.values()], page, total: result.total, hasMore: page < result.totalPages && result.items.length > 0,
        loading: false, moreLoading: false, error: '' });
    } catch (error) {
      if (request === generation) emit({ ...state, loading: false, moreLoading: false, error: error instanceof Error ? error.message : 'Could not load records.' });
    } finally { if (request === generation) busy = false; }
  }
  return { reset: () => fetchPage(true), more: () => fetchPage(), cancel: () => { generation++; busy = false; }, getState: () => state };
}
