import { RefreshCw } from 'lucide-react';
import { useEconomicDashboard } from '../../hooks/useEconomicDashboard';
import ExecutiveSummary from './ExecutiveSummary';
import InflationSection from './InflationSection';
import FxSection from './FxSection';
import CommoditiesSection from './CommoditiesSection';
import InterestRatesSection from './InterestRatesSection';
import BidCostModel from './BidCostModel';

export default function EconomicDashboard({ isAdmin }: { isAdmin: boolean }) {
  const { data, loading, error, saveScenario, refresh } = useEconomicDashboard();

  if (loading && !data) {
    return <div className="flex flex-1 items-center justify-center text-slate-400">경제지표를 불러오는 중…</div>;
  }
  if (error && !data) {
    return <div className="flex flex-1 items-center justify-center p-8 text-red-300">{error}</div>;
  }
  if (!data) return null;

  const byCat = (cat: string) => data.indicators.filter((i) => i.catalog.category === cat);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bid Economic Dashboard</p>
            <h1 className="text-2xl font-bold text-white">입찰 경제지표</h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              캐시 갱신
            </button>
          )}
        </div>
        {data.providerErrors.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-sm text-amber-100">
            {data.providerErrors.map((e) => (
              <p key={e.message}>
                [{e.provider}] {e.message}
              </p>
            ))}
          </div>
        )}
        <ExecutiveSummary summary={data.summary} />
        <InflationSection items={byCat('inflation')} />
        <FxSection items={byCat('fx')} />
        <CommoditiesSection items={[...byCat('energy'), ...byCat('nonferrous_metal')]} />
        <InterestRatesSection items={byCat('interest_rate')} spread={data.spread} />
        <BidCostModel calculation={data.bidCost} indicators={data.indicators} onSave={saveScenario} />
      </div>
    </div>
  );
}
