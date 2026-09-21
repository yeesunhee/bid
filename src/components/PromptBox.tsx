import { Bot, Copy, FileText, Terminal } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { usePromptStore } from '../hooks/usePromptStore';
import { Toast, useToast } from './Toast';

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function PromptBox() {
  const { prompts, selectedLevel2Id, selectedPromptId, selectPrompt, level2 } = usePromptStore();
  const { message, show } = useToast();

  const siblings = useMemo(
    () => prompts.filter((p) => p.categoryLevel2Id === selectedLevel2Id),
    [prompts, selectedLevel2Id],
  );
  const prompt = siblings.find((p) => p.id === selectedPromptId) ?? siblings[0];
  const tool = level2.find((c) => c.id === selectedLevel2Id);

  if (!selectedLevel2Id || !prompt) {
    return (
      <section className="flex flex-1 items-center justify-center p-8 text-slate-500">
        {tool ? `${tool.name}에 등록된 프롬프트가 없습니다.` : '좌측에서 단계 2를 선택하세요.'}
      </section>
    );
  }

  const copy = async (label: string, value: string) => {
    await copyText(value);
    show(`${label} 복사 완료`);
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden p-6">
      {siblings.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {siblings.map((item) => (
            <button
              key={item.id}
              onClick={() => selectPrompt(item.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                item.id === prompt.id
                  ? 'border-orange-400 bg-orange-500/20 text-orange-100'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">{prompt.title}</h2>
        {prompt.subtitle && <p className="mt-1 text-sm text-slate-400">{prompt.subtitle}</p>}
      </div>

      <div className="space-y-4 overflow-y-auto pr-1">
        <FieldCard
          icon={<Bot className="h-4 w-4 text-sky-300" />}
          label="에이전트 이름"
          onCopy={() => copy('에이전트 이름', prompt.agentName)}
        >
          <input className="field-input" readOnly value={prompt.agentName} />
        </FieldCard>
        <FieldCard
          icon={<FileText className="h-4 w-4 text-emerald-300" />}
          label="에이전트 설명"
          onCopy={() => copy('에이전트 설명', prompt.agentDescription)}
        >
          <textarea className="field-input min-h-[84px] resize-y" rows={3} readOnly value={prompt.agentDescription} />
        </FieldCard>
        <FieldCard
          icon={<Terminal className="h-4 w-4 text-amber-300" />}
          label="프롬프트"
          accent
          onCopy={() => copy('프롬프트', prompt.content)}
        >
          <textarea
            className="field-input min-h-[280px] resize-y font-mono text-[13px] leading-6"
            rows={10}
            readOnly
            value={prompt.content}
          />
        </FieldCard>
      </div>
      <Toast message={message} />
    </section>
  );
}

function FieldCard({
  icon,
  label,
  children,
  onCopy,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  children: ReactNode;
  onCopy: () => void;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-slate-900/50 p-4 ${accent ? 'border-amber-500/40' : 'border-slate-700'}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-semibold ${accent ? 'text-amber-200' : 'text-slate-200'}`}>
          {icon}
          {label}
        </div>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          <Copy className="h-3.5 w-3.5" />
          복사
        </button>
      </div>
      {children}
    </div>
  );
}
