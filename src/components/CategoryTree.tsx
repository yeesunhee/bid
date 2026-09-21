import { ChevronDown, ChevronRight, FolderTree, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePromptStore } from '../hooks/usePromptStore';

export default function CategoryTree() {
  const { level1, level2, prompts, selectedLevel2Id, selectLevel2, searchQuery } = usePromptStore();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const q = searchQuery.trim().toLowerCase();
  const matchedLevel2 = useMemo(() => {
    if (!q) return new Set<string>();
    return new Set(
      prompts
        .filter((p) =>
          [p.title, p.subtitle, p.agentName, p.agentDescription, p.content]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
        .map((p) => p.categoryLevel2Id),
    );
  }, [prompts, q]);

  if (collapsed) {
    return (
      <aside className="flex w-12 flex-col border-r border-slate-800 bg-slate-950/70">
        <button className="p-3 text-slate-400 hover:text-white" onClick={() => setCollapsed(false)}>
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 flex-col border-r border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-200">
        <span className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-orange-400" />
          카테고리
        </span>
        <button className="text-slate-400 hover:text-white" onClick={() => setCollapsed(true)}>
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {level1.length === 0 && (
          <p className="px-3 py-6 text-sm text-slate-500">단계가 없습니다. 관리자에서 단계 1을 생성하세요.</p>
        )}
        {level1.map((l1) => {
          const children = level2.filter((c) => c.parentId === l1.id).sort((a, b) => a.sortOrder - b.sortOrder);
          const isOpen = open[l1.id] ?? true;
          return (
            <div key={l1.id} className="mb-1">
              <button
                onClick={() => setOpen((s) => ({ ...s, [l1.id]: !isOpen }))}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {l1.name}
              </button>
              {isOpen && (
                <div className="ml-4">
                  {children.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-500">하위 단계 없음</p>
                  )}
                  {children.map((l2) => {
                    const highlight = matchedLevel2.has(l2.id);
                    const active = selectedLevel2Id === l2.id;
                    return (
                      <button
                        key={l2.id}
                        onClick={() => selectLevel2(l2.id)}
                        className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
                          active
                            ? 'bg-orange-500/20 text-orange-200'
                            : highlight
                              ? 'bg-amber-500/10 text-amber-200'
                              : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {l2.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
