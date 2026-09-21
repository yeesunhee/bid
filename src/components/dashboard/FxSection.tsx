import type { IndicatorSummary } from '../../types';
import IndicatorCard from './IndicatorCard';
import TrendChart from './TrendChart';
import { Section } from './InflationSection';
import { formatNumber } from './format';

export default function FxSection({ items }: { items: IndicatorSummary[] }) {
  const usd = items.find((i) => i.catalog.indicatorKey === 'usd_krw');
  const extras = items.filter((i) => ['jpy_krw', 'eur_krw', 'cny_krw'].includes(i.catalog.indicatorKey));
  return (
    <Section title="FX" subtitle="일간 환율 · 최근 영업일 기준. 월간 물가와 같은 시점으로 보이지 않습니다.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {usd && <IndicatorCard item={usd} />}
        {extras.map((item) => (
          <IndicatorCard key={item.catalog.indicatorKey} item={item} />
        ))}
      </div>
      {usd && (
        <div className="mt-4 rounded-xl border border-slate-800 p-3">
          <p className="mb-2 text-xs text-slate-400">
            USD/KRW 추세 · 1M 평균 {formatNumber(usd.averages['1M'])} · 3M {formatNumber(usd.averages['3M'])} · 6M {formatNumber(usd.averages['6M'])}
          </p>
          <TrendChart items={[usd]} months={12} />
        </div>
      )}
    </Section>
  );
}
