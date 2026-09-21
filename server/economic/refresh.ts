import { query, queryAll, queryOne } from '../db.ts';
import type {
  BidCostScenario,
  DashboardPayload,
  ExecutiveSummaryData,
  FactorItem,
  IndicatorCatalogItem,
  IndicatorSummary,
  NormalizedIndicatorPoint,
} from '../../src/types/index.ts';
import {
  CORE_INDICATOR_KEYS,
  asCategory,
  asFrequency,
  asProvider,
  providerLabel,
  type CatalogSeed,
} from './catalog.ts';
import { fetchEcosSeries, observationId } from './ecos.ts';
import { fetchEiaSeries } from './eia.ts';
import { fetchImfSeries } from './imf.ts';
import {
  RISK_RULE_TEXT,
  averageSet,
  calculateBidCost,
  changeSet,
  isStale,
} from './calculate.ts';

let refreshPromise: Promise<void> | null = null;
let lastRefreshAt = 0;

async function loadCatalog(): Promise<CatalogSeed[]> {
  const rows = await queryAll<Record<string, unknown>>(
    `SELECT indicator_key, provider, display_name_ko, category, frequency, unit, currency,
            mapping_json, source_url, active, verified_at
     FROM economic_indicator_catalog WHERE active = 1`,
  );
  return rows.map((row) => ({
    indicatorKey: String(row.indicator_key),
    provider: asProvider(String(row.provider)),
    displayNameKo: String(row.display_name_ko),
    category: asCategory(String(row.category)),
    frequency: asFrequency(String(row.frequency)),
    unit: row.unit ? String(row.unit) : undefined,
    currency: row.currency ? String(row.currency) : undefined,
    mapping: JSON.parse(String(row.mapping_json)),
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    active: Number(row.active) === 1,
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
  }));
}

async function upsertObservations(points: NormalizedIndicatorPoint[]) {
  for (const p of points) {
    await query(
      `INSERT INTO economic_observations (
         id, indicator_key, period, value, unit, currency, source_timestamp,
         fetched_at, source_reference, is_estimated
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (indicator_key, period) DO UPDATE SET
         value = EXCLUDED.value,
         unit = EXCLUDED.unit,
         currency = EXCLUDED.currency,
         source_timestamp = EXCLUDED.source_timestamp,
         fetched_at = EXCLUDED.fetched_at,
         source_reference = EXCLUDED.source_reference,
         is_estimated = EXCLUDED.is_estimated`,
      [
        observationId(p.indicatorKey, p.period),
        p.indicatorKey,
        p.period,
        p.value,
        p.unit,
        p.currency ?? null,
        p.sourceTimestamp,
        p.fetchedAt,
        p.sourceReference,
        p.isEstimated ? 1 : 0,
      ],
    );
  }
}

async function loadSeries(indicatorKey: string): Promise<NormalizedIndicatorPoint[]> {
  const catalog = (await loadCatalog()).find((c) => c.indicatorKey === indicatorKey);
  if (!catalog) return [];
  const rows = await queryAll<Record<string, unknown>>(
    `SELECT * FROM economic_observations WHERE indicator_key = $1 ORDER BY period ASC`,
    [indicatorKey],
  );
  return rows.map((row) => ({
    indicatorKey,
    provider: catalog.provider,
    indicatorName: catalog.displayNameKo,
    category: catalog.category,
    period: String(row.period),
    frequency: catalog.frequency,
    value: Number(row.value),
    unit: String(row.unit ?? catalog.unit ?? ''),
    currency: row.currency ? String(row.currency) : catalog.currency,
    sourceTimestamp: String(row.source_timestamp ?? row.period),
    fetchedAt: String(row.fetched_at),
    sourceReference: String(row.source_reference ?? ''),
    isEstimated: Number(row.is_estimated) === 1,
  }));
}

export async function refreshAll(force = false): Promise<{ errors: { provider: string; message: string }[] }> {
  if (refreshPromise) {
    await refreshPromise;
    return { errors: [] };
  }
  const now = Date.now();
  if (!force && now - lastRefreshAt < 10 * 60 * 1000) {
    return { errors: [] };
  }

  const errors: { provider: string; message: string }[] = [];
  refreshPromise = (async () => {
    const catalog = await loadCatalog();
    const results = await Promise.allSettled(
      catalog.map(async (item) => {
        let points: NormalizedIndicatorPoint[] = [];
        if (item.provider === 'ECOS') points = await fetchEcosSeries(item);
        else if (item.provider === 'EIA') points = await fetchEiaSeries(item);
        else points = await fetchImfSeries(item);
        await upsertObservations(points);
      }),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const item = catalog[index];
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push({ provider: item.provider, message: `${item.displayNameKo}: ${message}` });
      }
    });
    lastRefreshAt = Date.now();
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
  return { errors };
}

export async function needsRefresh(): Promise<boolean> {
  const row = await queryOne<{ fetched: string | null }>(
    'SELECT MAX(fetched_at) AS fetched FROM economic_observations',
  );
  if (!row?.fetched) return true;
  return Date.now() - new Date(row.fetched).getTime() > 6 * 60 * 60 * 1000;
}

function toCatalogItem(item: CatalogSeed): IndicatorCatalogItem {
  return item;
}

export async function buildIndicatorSummaries(keys?: string[]): Promise<IndicatorSummary[]> {
  const catalog = await loadCatalog();
  const selected = keys?.length
    ? catalog.filter((c) => keys.includes(c.indicatorKey))
    : catalog;
  const summaries: IndicatorSummary[] = [];
  for (const item of selected) {
    const series = await loadSeries(item.indicatorKey);
    const latest = series[series.length - 1];
    const stale = isStale(latest, item.frequency);
    let status: IndicatorSummary['status'] = 'ok';
    let statusMessage: string | undefined;
    if (!latest) {
      status = 'missing';
      statusMessage = '데이터 미수신';
    } else if (stale) {
      status = 'stale';
      statusMessage = '캐시 또는 기준시점이 오래되었습니다.';
    }
    summaries.push({
      catalog: toCatalogItem(item),
      latest,
      changes: changeSet(series, item.frequency),
      averages: averageSet(series, item.frequency),
      series,
      stale,
      status,
      statusMessage,
      providerLabel: providerLabel(item.provider),
    });
  }
  return summaries;
}

export async function loadBidScenario(id = 'default'): Promise<BidCostScenario> {
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM bid_cost_scenarios WHERE id = $1',
    [id],
  );
  if (!row) {
    throw new Error('원가 시나리오가 없습니다.');
  }
  return {
    id: String(row.id),
    name: String(row.name),
    baseCost: row.base_cost === null ? null : Number(row.base_cost),
    baseFx: row.base_fx === null ? null : Number(row.base_fx),
    weights: JSON.parse(String(row.weights_json)),
    riskWeights: row.risk_weights_json ? JSON.parse(String(row.risk_weights_json)) : undefined,
  };
}

export async function listBidScenarios(): Promise<BidCostScenario[]> {
  const rows = await queryAll<{ id: string }>('SELECT id FROM bid_cost_scenarios');
  const scenarios: BidCostScenario[] = [];
  for (const r of rows) {
    scenarios.push(await loadBidScenario(r.id));
  }
  return scenarios;
}

export async function saveBidScenario(scenario: BidCostScenario) {
  await query(
    `INSERT INTO bid_cost_scenarios (id, name, base_cost, base_fx, weights_json, risk_weights_json, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       base_cost = EXCLUDED.base_cost,
       base_fx = EXCLUDED.base_fx,
       weights_json = EXCLUDED.weights_json,
       risk_weights_json = EXCLUDED.risk_weights_json,
       updated_at = CURRENT_TIMESTAMP`,
    [
      scenario.id,
      scenario.name,
      scenario.baseCost,
      scenario.baseFx,
      JSON.stringify(scenario.weights),
      JSON.stringify(scenario.riskWeights ?? {}),
    ],
  );
}

function buildSummary(indicators: IndicatorSummary[], bid: ReturnType<typeof calculateBidCost>): ExecutiveSummaryData {
  const factors: FactorItem[] = bid.lines
    .filter((l) => l.contributionPct !== null)
    .map((l) => ({
      name: l.name,
      contributionPct: l.contributionPct as number,
      direction: (l.contributionPct as number) >= 0 ? 'up' : 'down',
    }));
  const topUpFactors = factors
    .filter((f) => f.direction === 'up')
    .sort((a, b) => b.contributionPct - a.contributionPct)
    .slice(0, 3);
  const topDownFactors = factors
    .filter((f) => f.direction === 'down')
    .sort((a, b) => a.contributionPct - b.contributionPct)
    .slice(0, 3);

  const core = indicators.filter((i) => CORE_INDICATOR_KEYS.includes(i.catalog.indicatorKey) && i.latest);
  const oldest = [...core].sort((a, b) => (a.latest!.period > b.latest!.period ? 1 : -1))[0];
  const notes = [...bid.notes];
  if (core.some((i) => i.status !== 'ok')) {
    notes.push('핵심 지표 일부가 없거나 stale 상태입니다.');
  }

  return {
    estimatedCostChangePct: bid.totalCostChangePct,
    riskLevel: bid.riskLevel,
    riskRuleText: RISK_RULE_TEXT,
    topUpFactors,
    topDownFactors,
    oldestCorePeriod: oldest?.latest?.period,
    oldestCoreIndicator: oldest?.catalog.displayNameKo,
    latestFetchedAt: core[0]?.latest?.fetchedAt,
    completeness: bid.completeness,
    notes,
  };
}

export async function buildDashboard(
  errors: { provider: string; message: string }[] = [],
): Promise<DashboardPayload> {
  const indicators = await buildIndicatorSummaries();
  const scenario = await loadBidScenario();
  const bidCost = calculateBidCost(scenario, indicators);
  const tbond = indicators.find((i) => i.catalog.indicatorKey === 'tbond_3y')?.latest;
  const corp = indicators.find((i) => i.catalog.indicatorKey === 'corp_aa_3y')?.latest;
  const spread =
    tbond && corp
      ? {
          value: corp.value - tbond.value,
          unit: 'percentage point',
          period: corp.period < tbond.period ? corp.period : tbond.period,
          status: 'ok' as const,
        }
      : { value: null, unit: 'percentage point', status: 'missing' as const };

  const fetched = indicators
    .map((i) => i.latest?.fetchedAt)
    .filter((x): x is string => Boolean(x))
    .sort()
    .at(-1);

  return {
    summary: buildSummary(indicators, bidCost),
    indicators,
    spread,
    bidCost,
    providerErrors: errors.map((e) => ({
      provider: asProvider(e.provider),
      message: e.message,
    })),
    refreshedAt: fetched,
  };
}
