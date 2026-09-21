import type { ReactNode } from 'react';
import type { IndicatorSummary } from '../../types';
import IndicatorCard from './IndicatorCard';
import TrendChart from './TrendChart';

export default function InflationSection({ items }: { items: IndicatorSummary[] }) {
  const ppi = items.find((i) => i.catalog.indicatorKey === 'ppi');
  const cpi = items.find((i) => i.catalog.indicatorKey === 'cpi');
  return (
    <Section title="Inflation" subtitle="PPI / CPI · 월간 발표 통계">
      <div className="grid gap-3 md:grid-cols-2">
        {ppi && <IndicatorCard item={ppi} />}
        {cpi && <IndicatorCard item={cpi} />}
      </div>
      <div className="mt-4 rounded-xl border border-slate-800 p-3">
        <p className="mb-2 text-xs text-slate-400">최근 24개월 추세 · Source: Bank of Korea ECOS · Calculated: 변화율</p>
        <TrendChart items={[ppi, cpi].filter((x): x is IndicatorSummary => Boolean(x))} months={24} />
      </div>
    </Section>
  );
}

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
