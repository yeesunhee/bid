import { useCallback, useEffect, useState } from 'react';
import type { HelpBoardView, HelpPost } from '../types';
import { api } from '../lib/api';

export function useHelpBoard() {
  const [view, setView] = useState<HelpBoardView>('list');
  const [posts, setPosts] = useState<HelpPost[]>([]);
  const [selected, setSelected] = useState<HelpPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.helpPosts();
      setPosts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openList = useCallback(() => {
    setView('list');
    setSelected(null);
    void loadList();
  }, [loadList]);

  const openCreate = useCallback(() => {
    setError(null);
    setView('create');
    setSelected(null);
  }, []);

  const openDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const post = await api.helpPost(id);
      setSelected(post);
      setView('detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const createPost = useCallback(async (title: string, body: string, files: File[]) => {
    const created = await api.createHelpPost(title, body, files);
    await loadList();
    setView('list');
    setSelected(null);
    return created;
  }, [loadList]);

  const removePost = useCallback(
    async (id: string) => {
      await api.deleteHelpPost(id);
      if (selected?.id === id) setSelected(null);
      setView('list');
      await loadList();
    },
    [loadList, selected?.id],
  );

  return {
    view,
    posts,
    selected,
    loading,
    error,
    setError,
    openList,
    openCreate,
    openDetail,
    createPost,
    removePost,
  };
}
