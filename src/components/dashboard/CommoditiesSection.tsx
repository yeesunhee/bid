import type { IndicatorSummary } from '../../types';
import IndicatorCard from './IndicatorCard';
import TrendChart from './TrendChart';
import { Section } from './InflationSection';

export default function CommoditiesSection({ items }: { items: IndicatorSummary[] }) {
  const energy = items.filter((i) => ['wti', 'brent', 'natgas'].includes(i.catalog.indicatorKey));
  const metals = items.filter((i) =>
    ['copper', 'aluminum', 'nickel', 'zinc'].includes(i.catalog.indicatorKey),
  );
  return (
    <Section title="Commodities" subtitle="에너지: U.S. EIA(일간) · 비철금속: IMF PCPS(월간). 주기를 섞어 실시간처럼 표시하지 않습니다.">
      <h3 className="text-sm font-medium text-slate-300">Energy · EIA</h3>
      <div className="grid gap-3 md:grid-cols-3">{energy.map((item) => <IndicatorCard key={item.catalog.indicatorKey} item={item} />)}</div>
      <div className="rounded-xl border border-slate-800 p-3">
        <TrendChart items={energy} months={12} />
      </div>
      <h3 className="text-sm font-medium text-slate-300">Nonferrous metals · IMF PCPS (월간)</h3>
      <div className="grid gap-3 md:grid-cols-4">{metals.map((item) => <IndicatorCard key={item.catalog.indicatorKey} item={item} />)}</div>
      <div className="rounded-xl border border-slate-800 p-3">
        <p className="mb-2 text-xs text-slate-400">월간 가격 · 일별 보간 없음 · Calculated: 기간 변화율</p>
        <TrendChart items={metals} months={24} />
      </div>
    </Section>
  );
}
