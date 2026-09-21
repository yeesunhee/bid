import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CategoryLevel1, CategoryLevel2, PromptTemplate } from '../types';
import { api, getToken, setToken } from '../lib/api';

interface PromptStore {
  level1: CategoryLevel1[];
  level2: CategoryLevel2[];
  prompts: PromptTemplate[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  selectedLevel2Id: string | null;
  selectedPromptId: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectLevel2: (id: string) => void;
  selectPrompt: (id: string) => void;
  login: (password: string) => Promise<void>;
  logout: () => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<PromptStore | null>(null);

export function PromptStoreProvider({ children }: { children: ReactNode }) {
  const [level1, setLevel1] = useState<CategoryLevel1[]>([]);
  const [level2, setLevel2] = useState<CategoryLevel2[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(Boolean(getToken()));
  const [selectedLevel2Id, setSelectedLevel2Id] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l1, l2, p] = await Promise.all([api.level1(), api.level2(), api.prompts()]);
      setLevel1(l1);
      setLevel2(l2);
      setPrompts(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectLevel2 = useCallback(
    (id: string) => {
      setSelectedLevel2Id(id);
      const first = prompts.find((p) => p.categoryLevel2Id === id);
      setSelectedPromptId(first?.id ?? null);
    },
    [prompts],
  );

  useEffect(() => {
    if (selectedLevel2Id) return;
    const firstL1 = [...level1].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    const firstL2 = [...level2]
      .filter((c) => c.parentId === firstL1?.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (firstL2) selectLevel2(firstL2.id);
  }, [level1, level2, selectedLevel2Id, selectLevel2]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const hit = prompts.find((p) =>
      [p.title, p.subtitle, p.agentName, p.agentDescription, p.content, ...(p.tags ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
    if (hit) {
      setSelectedLevel2Id(hit.categoryLevel2Id);
      setSelectedPromptId(hit.id);
    }
  }, [searchQuery, prompts]);

  const value = useMemo<PromptStore>(
    () => ({
      level1,
      level2,
      prompts,
      loading,
      error,
      isAdmin,
      selectedLevel2Id,
      selectedPromptId,
      searchQuery,
      setSearchQuery,
      selectLevel2,
      selectPrompt: setSelectedPromptId,
      login: async (password: string) => {
        const { token } = await api.login(password);
        setToken(token);
        setIsAdmin(true);
      },
      logout: () => {
        setToken(null);
        setIsAdmin(false);
      },
      reload,
    }),
    [
      level1,
      level2,
      prompts,
      loading,
      error,
      isAdmin,
      selectedLevel2Id,
      selectedPromptId,
      searchQuery,
      selectLevel2,
      reload,
    ],
  );

  return createElement(Ctx.Provider, { value }, children);
}

export function usePromptStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('PromptStoreProvider 필요');
  return ctx;
}
