import type { ExecutiveSummaryData } from '../../types';
import { formatPct, pctClass } from './format';

export default function ExecutiveSummary({ summary }: { summary: ExecutiveSummaryData }) {
  return (
    <section className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-300">Executive Summary</p>
          <h2 className="text-xl font-semibold text-white">입찰 원가 환경 한눈에 보기</h2>
        </div>
        <Completeness value={summary.completeness} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="추정 원가 변화율(3M 가중)" value={formatPct(summary.estimatedCostChangePct)} className={pctClass(summary.estimatedCostChangePct)} />
        <Stat label="Risk Level" value={summary.riskLevel ?? 'N/A'} className={riskClass(summary.riskLevel)} />
        <Stat label="가장 오래된 핵심 지표 기준" value={summary.oldestCorePeriod ?? 'N/A'} />
        <Stat label="해당 지표" value={summary.oldestCoreIndicator ?? 'N/A'} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <FactorList title="상승 요인 Top 3" items={summary.topUpFactors} up />
        <FactorList title="하락 요인 Top 3" items={summary.topDownFactors} />
      </div>
      <p className="mt-4 text-[11px] leading-5 text-slate-400">{summary.riskRuleText}</p>
      {summary.notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-200">
          {summary.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${className ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

function FactorList({
  title,
  items,
  up,
}: {
  title: string;
  items: ExecutiveSummaryData['topUpFactors'];
  up?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-200">{title}</h3>
      {items.length === 0 && <p className="text-xs text-slate-500">해당 요인 없음</p>}
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.name} className="flex justify-between">
            <span>{item.name}</span>
            <span className={up ? 'text-rose-300' : 'text-emerald-300'}>
              {item.contributionPct >= 0 ? '+' : ''}
              {item.contributionPct.toFixed(2)}%p
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Completeness({ value }: { value: ExecutiveSummaryData['completeness'] }) {
  const map = {
    complete: 'bg-emerald-500/15 text-emerald-300',
    partial: 'bg-amber-500/15 text-amber-300',
    incomplete: 'bg-red-500/15 text-red-300',
  };
  return <span className={`rounded-full px-3 py-1 text-xs ${map[value]}`}>{value.toUpperCase()}</span>;
}

function riskClass(level: ExecutiveSummaryData['riskLevel']): string {
  if (level === 'LOW') return 'text-emerald-300';
  if (level === 'MEDIUM') return 'text-amber-300';
  if (level === 'HIGH') return 'text-orange-300';
  if (level === 'VERY_HIGH') return 'text-red-300';
  return 'text-slate-300';
}
