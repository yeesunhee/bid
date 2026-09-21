import { useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { usePromptStore } from '../hooks/usePromptStore';
import { api } from '../lib/api';
import type { CategoryLevel1, CategoryLevel2, PromptTemplate } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'categories' | 'prompts';

const emptyPrompt = (level2Id: string): Partial<PromptTemplate> => ({
  categoryLevel2Id: level2Id,
  title: '',
  subtitle: '',
  agentName: '',
  agentDescription: '',
  content: '',
  tags: [],
});

export default function AdminEditor({ open, onClose }: Props) {
  const { level1, level2, prompts, reload } = usePromptStore();
  const [tab, setTab] = useState<Tab>('categories');
  const [error, setError] = useState<string | null>(null);
  const [l1Form, setL1Form] = useState({ name: '', sortOrder: level1.length + 1 });
  const [l2Form, setL2Form] = useState({
    parentId: level1[0]?.id ?? '',
    name: '',
    description: '',
    sortOrder: 1,
  });
  const [editingL1, setEditingL1] = useState<CategoryLevel1 | null>(null);
  const [editingL2, setEditingL2] = useState<CategoryLevel2 | null>(null);
  const [promptForm, setPromptForm] = useState<Partial<PromptTemplate>>(emptyPrompt(level2[0]?.id ?? ''));
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  const childCount = (id: string) => level2.filter((c) => c.parentId === id).length;
  const promptCount = (id: string) => prompts.filter((p) => p.categoryLevel2Id === id).length;

  const selectedParent = useMemo(
    () => l2Form.parentId || level1[0]?.id || '',
    [l2Form.parentId, level1],
  );

  if (!open) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h2 className="font-semibold text-white">관리자</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 border-b border-slate-800 px-5 py-2">
          {(['categories', 'prompts'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? 'bg-orange-500/20 text-orange-200' : 'text-slate-300'}`}
            >
              {t === 'categories' ? '단계 관리' : '프롬프트 관리'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {error && <p className="mb-3 text-red-400">{error}</p>}
          {tab === 'categories' ? (
            <div className="grid gap-6 md:grid-cols-2">
              <section>
                <h3 className="mb-3 font-semibold text-slate-100">단계 1</h3>
                <div className="mb-3 flex gap-2">
                  <input
                    className="field-input"
                    placeholder="이름"
                    value={editingL1 ? editingL1.name : l1Form.name}
                    onChange={(e) =>
                      editingL1
                        ? setEditingL1({ ...editingL1, name: e.target.value })
                        : setL1Form({ ...l1Form, name: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    className="field-input w-24"
                    value={editingL1 ? editingL1.sortOrder : l1Form.sortOrder}
                    onChange={(e) =>
                      editingL1
                        ? setEditingL1({ ...editingL1, sortOrder: Number(e.target.value) })
                        : setL1Form({ ...l1Form, sortOrder: Number(e.target.value) })
                    }
                  />
                  <button
                    className="rounded-lg bg-orange-500 px-3 text-white"
                    onClick={() =>
                      run(async () => {
                        if (editingL1) {
                          await api.updateLevel1(editingL1.id, {
                            name: editingL1.name,
                            sortOrder: editingL1.sortOrder,
                          });
                          setEditingL1(null);
                        } else {
                          await api.createLevel1(l1Form);
                          setL1Form({ name: '', sortOrder: level1.length + 2 });
                        }
                      })
                    }
                  >
                    {editingL1 ? '수정' : '추가'}
                  </button>
                </div>
                <ul className="space-y-2">
                  {level1.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-700 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-xs text-slate-400">
                            순서 {item.sortOrder} · 하위 {childCount(item.id)}개
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-sky-300" onClick={() => setEditingL1(item)}>
                            편집
                          </button>
                          <button
                            disabled={childCount(item.id) > 0}
                            className="text-red-400 disabled:opacity-30"
                            title={childCount(item.id) > 0 ? '하위 단계 2를 먼저 이동/삭제하세요' : '삭제'}
                            onClick={() => run(() => api.deleteLevel1(item.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="mb-3 font-semibold text-slate-100">단계 2</h3>
                <div className="mb-3 space-y-2">
                  <select
                    className="field-input"
                    value={editingL2 ? editingL2.parentId : selectedParent}
                    onChange={(e) =>
                      editingL2
                        ? setEditingL2({ ...editingL2, parentId: e.target.value })
                        : setL2Form({ ...l2Form, parentId: e.target.value })
                    }
                  >
                    {level1.map((l1) => (
                      <option key={l1.id} value={l1.id}>
                        {l1.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field-input"
                    placeholder="이름"
                    value={editingL2 ? editingL2.name : l2Form.name}
                    onChange={(e) =>
                      editingL2
                        ? setEditingL2({ ...editingL2, name: e.target.value })
                        : setL2Form({ ...l2Form, name: e.target.value })
                    }
                  />
                  <input
                    className="field-input"
                    placeholder="설명"
                    value={editingL2 ? editingL2.description ?? '' : l2Form.description}
                    onChange={(e) =>
                      editingL2
                        ? setEditingL2({ ...editingL2, description: e.target.value })
                        : setL2Form({ ...l2Form, description: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="field-input w-24"
                      value={editingL2 ? editingL2.sortOrder : l2Form.sortOrder}
                      onChange={(e) =>
                        editingL2
                          ? setEditingL2({ ...editingL2, sortOrder: Number(e.target.value) })
                          : setL2Form({ ...l2Form, sortOrder: Number(e.target.value) })
                      }
                    />
                    <button
                      className="rounded-lg bg-orange-500 px-3 text-white"
                      onClick={() =>
                        run(async () => {
                          if (editingL2) {
                            await api.updateLevel2(editingL2.id, {
                              parentId: editingL2.parentId,
                              name: editingL2.name,
                              description: editingL2.description,
                              sortOrder: editingL2.sortOrder,
                            });
                            setEditingL2(null);
                          } else {
                            await api.createLevel2({ ...l2Form, parentId: selectedParent });
                            setL2Form({ parentId: selectedParent, name: '', description: '', sortOrder: 1 });
                          }
                        })
                      }
                    >
                      {editingL2 ? '수정' : '추가'}
                    </button>
                  </div>
                </div>
                <ul className="space-y-2">
                  {level2.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-700 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-xs text-slate-400">
                            {level1.find((l) => l.id === item.parentId)?.name} · 프롬프트 {promptCount(item.id)}개
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-sky-300" onClick={() => setEditingL2(item)}>
                            편집
                          </button>
                          <button
                            disabled={promptCount(item.id) > 0}
                            className="text-red-400 disabled:opacity-30"
                            title={promptCount(item.id) > 0 ? '연결된 프롬프트를 먼저 이동/삭제하세요' : '삭제'}
                            onClick={() => run(() => api.deleteLevel2(item.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <section className="space-y-2">
                <select
                  className="field-input"
                  value={promptForm.categoryLevel2Id ?? ''}
                  onChange={(e) => setPromptForm({ ...promptForm, categoryLevel2Id: e.target.value })}
                >
                  <option value="">단계 2 선택</option>
                  {level2.map((l2) => (
                    <option key={l2.id} value={l2.id}>
                      {level1.find((l) => l.id === l2.parentId)?.name} / {l2.name}
                    </option>
                  ))}
                </select>
                <input
                  className="field-input"
                  placeholder="제목"
                  value={promptForm.title ?? ''}
                  onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })}
                />
                <input
                  className="field-input"
                  placeholder="1. 에이전트 이름"
                  value={promptForm.agentName ?? ''}
                  onChange={(e) => setPromptForm({ ...promptForm, agentName: e.target.value })}
                />
                <textarea
                  className="field-input min-h-[80px]"
                  placeholder="2. 에이전트 설명"
                  value={promptForm.agentDescription ?? ''}
                  onChange={(e) => setPromptForm({ ...promptForm, agentDescription: e.target.value })}
                />
                <textarea
                  className="field-input min-h-[180px] font-mono"
                  placeholder="3. 프롬프트 복사용 원문"
                  value={promptForm.content ?? ''}
                  onChange={(e) => setPromptForm({ ...promptForm, content: e.target.value })}
                />
                <button
                  className="rounded-lg bg-orange-500 px-4 py-2 text-white"
                  onClick={() =>
                    run(async () => {
                      if (!promptForm.categoryLevel2Id) throw new Error('단계 2를 선택하세요.');
                      if (editingPromptId) {
                        await api.updatePrompt(editingPromptId, promptForm);
                      } else {
                        await api.createPrompt(promptForm);
                      }
                      setEditingPromptId(null);
                      setPromptForm(emptyPrompt(promptForm.categoryLevel2Id));
                    })
                  }
                >
                  {editingPromptId ? '프롬프트 수정' : '프롬프트 추가'}
                </button>
                <button
                  className="ml-2 rounded-lg border border-red-500/40 px-4 py-2 text-red-200"
                  onClick={() =>
                    run(async () => {
                      if (!confirm('카테고리와 시드 프롬프트 4건으로 리셋할까요? 추가한 프롬프트는 삭제됩니다. 경제지표 캐시는 유지됩니다.')) {
                        return;
                      }
                      await api.resetPrompts();
                    })
                  }
                >
                  DB 초기 데이터로 리셋
                </button>
              </section>
              <section className="space-y-2">
                {prompts.map((p) => (
                  <div key={p.id} className="rounded-lg border border-slate-700 p-3">
                    <p className="font-medium text-white">{p.title}</p>
                    <p className="text-xs text-slate-400">{p.agentName}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="text-sky-300"
                        onClick={() => {
                          setEditingPromptId(p.id);
                          setPromptForm(p);
                        }}
                      >
                        편집
                      </button>
                      <button className="text-red-400" onClick={() => run(() => api.deletePrompt(p.id))}>
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
