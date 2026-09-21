import type { IndicatorSummary } from '../../types';
import { formatNumber, formatPct, pctClass, periodLabel } from './format';

export default function IndicatorCard({ item }: { item: IndicatorSummary }) {
  const change = item.changes['3M'] ?? item.changes['1M'] ?? item.changes.MoM ?? null;
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{item.catalog.displayNameKo}</h3>
          <p className="text-[11px] text-slate-400">{item.providerLabel}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-2xl font-semibold text-white">
        {item.latest ? formatNumber(item.latest.value) : 'N/A'}
        <span className="ml-1 text-xs font-normal text-slate-400">{item.latest?.unit || item.catalog.unit}</span>
      </p>
      <p className={`mt-1 text-sm ${pctClass(change)}`}>3M {formatPct(change)}</p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span>{periodLabel(item)}</span>
        {item.catalog.frequency === 'monthly' && <span>월간 통계 · 실시간 아님</span>}
        {item.latest?.isEstimated && <span className="text-amber-300">추정값</span>}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 text-[11px] text-slate-400">
        {(['1M', '3M', '6M', '12M'] as const).map((k) => (
          <div key={k}>
            <div>{k}</div>
            <div className={pctClass(item.changes[k])}>{formatPct(item.changes[k])}</div>
          </div>
        ))}
      </div>
      {item.catalog.frequency === 'daily' && (
        <div className="mt-2 text-[11px] text-slate-500">
          30일 평균 {formatNumber(item.averages['30D'])} · 90일 평균 {formatNumber(item.averages['90D'])}
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: IndicatorSummary['status'] }) {
  const map = {
    ok: 'bg-emerald-500/15 text-emerald-300',
    stale: 'bg-amber-500/15 text-amber-300',
    missing: 'bg-slate-700 text-slate-300',
    error: 'bg-red-500/15 text-red-300',
  };
  const label = { ok: '정상', stale: 'stale', missing: '미수신', error: '오류' };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] ${map[status]}`}>{label[status]}</span>;
}
