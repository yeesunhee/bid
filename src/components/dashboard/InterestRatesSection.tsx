import type { DashboardPayload, IndicatorSummary } from '../../types';
import IndicatorCard from './IndicatorCard';
import TrendChart from './TrendChart';
import { Section } from './InflationSection';
import { formatNumber } from './format';

export default function InterestRatesSection({
  items,
  spread,
}: {
  items: IndicatorSummary[];
  spread?: DashboardPayload['spread'];
}) {
  const keys = ['base_rate', 'cd_91', 'tbond_3y', 'corp_aa_3y'];
  const rates = keys
    .map((k) => items.find((i) => i.catalog.indicatorKey === k))
    .filter((x): x is IndicatorSummary => Boolean(x));
  const spreadSeries = buildSpreadSeries(items);
  return (
    <Section title="Interest Rates" subtitle="시장금리 일간 · 스프레드는 회사채 AA- 3년과 국고채 3년이 모두 있을 때만 계산">
      <div className="grid gap-3 md:grid-cols-4">
        {rates.map((item) => (
          <IndicatorCard key={item.catalog.indicatorKey} item={item} />
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 p-3">
        <p className="mb-2 text-xs text-slate-400">
          회사채-국고채 스프레드:{' '}
          {spread?.value === null || spread?.value === undefined
            ? 'N/A'
            : `${formatNumber(spread.value, 3)} ${spread.unit}`}
          {spread?.period ? ` · ${spread.period}` : ''}
        </p>
        <TrendChart items={spreadSeries} months={12} />
      </div>
    </Section>
  );
}

function buildSpreadSeries(items: IndicatorSummary[]): IndicatorSummary[] {
  const tbond = items.find((i) => i.catalog.indicatorKey === 'tbond_3y');
  const corp = items.find((i) => i.catalog.indicatorKey === 'corp_aa_3y');
  if (!tbond || !corp) return [tbond, corp].filter((x): x is IndicatorSummary => Boolean(x));
  const byPeriod = new Map(tbond.series.map((p) => [p.period, p.value]));
  const series = corp.series
    .filter((p) => byPeriod.has(p.period))
    .map((p) => ({
      ...p,
      indicatorKey: 'credit_spread',
      indicatorName: '회사채-국고채 스프레드',
      value: p.value - (byPeriod.get(p.period) as number),
      unit: 'percentage point',
      isEstimated: false,
      sourceReference: 'Calculated: corp_aa_3y - tbond_3y',
    }));
  return [
    {
      ...corp,
      catalog: {
        ...corp.catalog,
        indicatorKey: 'credit_spread',
        displayNameKo: '회사채-국고채 스프레드',
      },
      series,
      latest: series[series.length - 1],
    },
  ];
}
