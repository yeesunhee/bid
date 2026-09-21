import { useEffect, useState } from 'react';
import type { BidCostCalculation, BidCostScenario, IndicatorSummary } from '../../types';
import { formatNumber, formatPct, pctClass } from './format';
import { Section } from './InflationSection';

export default function BidCostModel({
  calculation,
  indicators,
  onSave,
}: {
  calculation: BidCostCalculation;
  indicators: IndicatorSummary[];
  onSave: (scenario: BidCostScenario) => Promise<void>;
}) {
  const [draft, setDraft] = useState(calculation.scenario);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(calculation.scenario), [calculation.scenario]);

  const indicatorOptions = indicators.map((i) => i.catalog);

  return (
    <Section
      title="Bid Cost Model"
      subtitle="원가 비중 합이 100%가 아니면 자동 보정하지 않습니다. 철강 국제 현물은 3-provider 제약으로 제공하지 않으며 ECOS PPI·수입물가·USD/KRW 조합을 사용합니다."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-slate-400">
          프로젝트/입찰명
          <input
            className="field-input mt-1"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className="text-xs text-slate-400">
          기준 원가
          <input
            type="number"
            className="field-input mt-1"
            value={draft.baseCost ?? ''}
            onChange={(e) => setDraft({ ...draft, baseCost: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>
        <label className="text-xs text-slate-400">
          기준 환율
          <input
            type="number"
            className="field-input mt-1"
            value={draft.baseFx ?? ''}
            onChange={(e) => setDraft({ ...draft, baseFx: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs text-slate-400">
            <tr>
              <th className="px-3 py-2">항목</th>
              <th className="px-3 py-2">비중 %</th>
              <th className="px-3 py-2">적용 지표</th>
              <th className="px-3 py-2">Commodity</th>
              <th className="px-3 py-2">FX</th>
              <th className="px-3 py-2">Combined KRW</th>
              <th className="px-3 py-2">기여도</th>
            </tr>
          </thead>
          <tbody>
            {draft.weights.map((line, idx) => {
              const result = calculation.lines.find((l) => l.id === line.id);
              return (
                <tr key={line.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <input
                      className="field-input"
                      value={line.name}
                      onChange={(e) => updateLine(idx, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 w-24">
                    <input
                      type="number"
                      className="field-input"
                      value={line.weightPct}
                      onChange={(e) => updateLine(idx, { weightPct: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="field-input"
                      value={line.indicatorKeys[0] ?? ''}
                      onChange={(e) => updateLine(idx, { indicatorKeys: [e.target.value] })}
                    >
                      {indicatorOptions.map((opt) => (
                        <option key={opt.indicatorKey} value={opt.indicatorKey}>
                          {opt.displayNameKo}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`px-3 py-2 ${pctClass(result?.commodityEffectPct)}`}>{formatPct(result?.commodityEffectPct)}</td>
                  <td className={`px-3 py-2 ${pctClass(result?.fxEffectPct)}`}>{formatPct(result?.fxEffectPct)}</td>
                  <td className={`px-3 py-2 ${pctClass(result?.combinedKrwEffectPct)}`}>{formatPct(result?.combinedKrwEffectPct)}</td>
                  <td className={`px-3 py-2 ${pctClass(result?.contributionPct)}`}>
                    {formatPct(result?.contributionPct)}
                    <div className="text-[10px] text-slate-500">{result?.status}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {calculation.weightWarning && <p className="text-sm text-amber-300">{calculation.weightWarning}</p>}
      <div className="grid gap-3 md:grid-cols-4">
        <Result label="비중 합" value={`${calculation.weightSum.toFixed(1)}%`} />
        <Result label="총 추정 원가 변화율" value={formatPct(calculation.totalCostChangePct)} className={pctClass(calculation.totalCostChangePct)} />
        <Result label="추정 원가" value={formatNumber(calculation.estimatedCost, 0)} />
        <Result label="리스크 등급" value={calculation.riskLevel ?? 'N/A'} />
      </div>
      <button
        disabled={busy}
        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        onClick={async () => {
          setBusy(true);
          try {
            await onSave(draft);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? '저장 중…' : '시나리오 저장 후 재계산'}
      </button>
    </Section>
  );

  function updateLine(idx: number, patch: Partial<(typeof draft.weights)[number]>) {
    const weights = draft.weights.map((line, i) => (i === idx ? { ...line, ...patch } : line));
    setDraft({ ...draft, weights });
  }
}

function Result({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${className ?? 'text-white'}`}>{value}</p>
    </div>
  );
}
