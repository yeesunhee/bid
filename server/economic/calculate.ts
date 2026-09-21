import type {
  BidCostCalculation,
  BidCostLineResult,
  BidCostScenario,
  EconomicFrequency,
  IndicatorSummary,
  NormalizedIndicatorPoint,
  RiskLevel,
} from '../../src/types/index.ts';

export function pctChange(latest: number | undefined, past: number | undefined): number | null {
  if (latest === undefined || past === undefined || past === 0) return null;
  return ((latest - past) / past) * 100;
}

export function pointNPeriodsAgo(
  series: NormalizedIndicatorPoint[],
  n: number,
  frequency: EconomicFrequency,
): NormalizedIndicatorPoint | undefined {
  if (series.length === 0) return undefined;
  const latest = series[series.length - 1];
  if (frequency === 'monthly') {
    const [y, m] = latest.period.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    d.setMonth(d.getMonth() - n);
    const target = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return series.find((p) => p.period === target);
  }
  const latestDate = new Date(latest.period);
  if (Number.isNaN(latestDate.getTime())) return undefined;
  const targetTime = latestDate.getTime() - n * 24 * 60 * 60 * 1000;
  let best: NormalizedIndicatorPoint | undefined;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const p of series) {
    const t = new Date(p.period).getTime();
    if (Number.isNaN(t) || t > targetTime) continue;
    const diff = targetTime - t;
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best;
}

export function averageLast(series: NormalizedIndicatorPoint[], days: number): number | null {
  if (series.length === 0) return null;
  const latest = new Date(series[series.length - 1].period).getTime();
  if (Number.isNaN(latest)) return null;
  const cutoff = latest - days * 24 * 60 * 60 * 1000;
  const window = series.filter((p) => {
    const t = new Date(p.period).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
  if (window.length === 0) return null;
  const sum = window.reduce((acc, p) => acc + p.value, 0);
  return sum / window.length;
}

export function monthlyAverage(series: NormalizedIndicatorPoint[], months: number): number | null {
  if (series.length === 0) return null;
  const window = series.slice(-months);
  if (window.length === 0) return null;
  return window.reduce((acc, p) => acc + p.value, 0) / window.length;
}

export function isStale(latest: NormalizedIndicatorPoint | undefined, frequency: EconomicFrequency): boolean {
  if (!latest) return true;
  const fetched = new Date(latest.fetchedAt).getTime();
  if (Number.isNaN(fetched)) return true;
  const ageMs = Date.now() - fetched;
  if (frequency === 'daily' && ageMs > 36 * 60 * 60 * 1000) return true;
  if (frequency === 'monthly' && ageMs > 48 * 60 * 60 * 1000) return true;

  if (frequency === 'daily') {
    const period = new Date(latest.period).getTime();
    if (Number.isNaN(period)) return true;
    return Date.now() - period > 7 * 24 * 60 * 60 * 1000;
  }
  if (frequency === 'monthly') {
    const [y, m] = latest.period.split('-').map(Number);
    if (!y || !m) return true;
    const periodDate = new Date(y, m - 1, 1);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setHours(0, 0, 0, 0);
    twoMonthsAgo.setDate(1);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    return periodDate < twoMonthsAgo;
  }
  return false;
}

export function changeSet(
  series: NormalizedIndicatorPoint[],
  frequency: EconomicFrequency,
): Record<string, number | null> {
  const latest = series[series.length - 1];
  const m1 = pointNPeriodsAgo(series, frequency === 'daily' ? 30 : 1, frequency);
  const m3 = pointNPeriodsAgo(series, frequency === 'daily' ? 90 : 3, frequency);
  const m6 = pointNPeriodsAgo(series, frequency === 'daily' ? 180 : 6, frequency);
  const m12 = pointNPeriodsAgo(series, frequency === 'daily' ? 365 : 12, frequency);
  return {
    '1M': pctChange(latest?.value, m1?.value),
    '3M': pctChange(latest?.value, m3?.value),
    '6M': pctChange(latest?.value, m6?.value),
    '12M': pctChange(latest?.value, m12?.value),
    MoM: frequency === 'monthly' ? pctChange(latest?.value, m1?.value) : null,
    YoY: frequency === 'monthly' ? pctChange(latest?.value, m12?.value) : null,
  };
}

export function averageSet(
  series: NormalizedIndicatorPoint[],
  frequency: EconomicFrequency,
): Record<string, number | null> {
  if (frequency === 'daily') {
    return {
      '30D': averageLast(series, 30),
      '90D': averageLast(series, 90),
      '1M': averageLast(series, 30),
      '3M': averageLast(series, 90),
      '6M': averageLast(series, 180),
    };
  }
  return {
    '3M': monthlyAverage(series, 3),
    '6M': monthlyAverage(series, 6),
  };
}

export function classifyRisk(absPct: number | null): RiskLevel | null {
  if (absPct === null) return null;
  const v = Math.abs(absPct);
  if (v < 3) return 'LOW';
  if (v < 7) return 'MEDIUM';
  if (v < 12) return 'HIGH';
  return 'VERY_HIGH';
}

function lineEffect(
  indicators: IndicatorSummary[],
  keys: string[],
  fxKey: string | undefined,
): Pick<BidCostLineResult, 'commodityEffectPct' | 'fxEffectPct' | 'combinedKrwEffectPct' | 'status' | 'note'> {
  const pick = (key: string) => indicators.find((i) => i.catalog.indicatorKey === key);
  const commoditySources = keys.map(pick).filter((x): x is IndicatorSummary => Boolean(x));
  const commodityChanges = commoditySources
    .map((s) => s.changes['3M'] ?? s.changes['1M'])
    .filter((v): v is number => v !== null && v !== undefined);

  if (commodityChanges.length === 0) {
    return {
      commodityEffectPct: null,
      fxEffectPct: null,
      combinedKrwEffectPct: null,
      status: 'incomplete',
      note: '연결 지표 관측값이 없습니다.',
    };
  }
  const commodityEffectPct =
    commodityChanges.reduce((a, b) => a + b, 0) / commodityChanges.length;

  const fx = fxKey ? pick(fxKey) : undefined;
  const fxEffectPct = fx ? (fx.changes['3M'] ?? fx.changes['1M'] ?? null) : null;

  const commodityLatest = commoditySources[0]?.latest;
  const commodityPast = pointNPeriodsAgo(
    commoditySources[0]?.series ?? [],
    commoditySources[0]?.catalog.frequency === 'daily' ? 90 : 3,
    commoditySources[0]?.catalog.frequency ?? 'monthly',
  );
  const fxLatest = fx?.latest;
  const fxPast = fx
    ? pointNPeriodsAgo(
        fx.series,
        fx.catalog.frequency === 'daily' ? 90 : 3,
        fx.catalog.frequency,
      )
    : undefined;

  let combinedKrwEffectPct: number | null = null;
  if (commodityLatest && commodityPast && fxLatest && fxPast) {
    const now = commodityLatest.value * fxLatest.value;
    const then = commodityPast.value * fxPast.value;
    combinedKrwEffectPct = pctChange(now, then);
  } else if (!fxKey) {
    combinedKrwEffectPct = commodityEffectPct;
  }

  const missingFx = Boolean(fxKey) && (fxEffectPct === null || combinedKrwEffectPct === null);
  const partial = missingFx || commodityChanges.length < keys.length;
  return {
    commodityEffectPct,
    fxEffectPct,
    combinedKrwEffectPct,
    status: partial ? 'partial' : 'ok',
    note: missingFx ? '환율 결합에 필요한 시계열이 부족합니다.' : undefined,
  };
}

export function calculateBidCost(
  scenario: BidCostScenario,
  indicators: IndicatorSummary[],
): BidCostCalculation {
  const weightSum = scenario.weights.reduce((acc, w) => acc + w.weightPct, 0);
  const notes: string[] = [];
  let weightWarning: string | undefined;
  if (Math.abs(weightSum - 100) > 0.05) {
    weightWarning = `원가 비중 합이 ${weightSum.toFixed(1)}%입니다. 100%가 아니면 자동 보정하지 않습니다.`;
    notes.push(weightWarning);
  }

  const lines: BidCostLineResult[] = scenario.weights.map((line) => {
    const effect = lineEffect(indicators, line.indicatorKeys, line.fxKey);
    const base = effect.combinedKrwEffectPct ?? effect.commodityEffectPct;
    const contributionPct = base === null ? null : (base * line.weightPct) / 100;
    return {
      id: line.id,
      name: line.name,
      weightPct: line.weightPct,
      commodityEffectPct: effect.commodityEffectPct,
      fxEffectPct: effect.fxEffectPct,
      combinedKrwEffectPct: effect.combinedKrwEffectPct,
      contributionPct,
      status: effect.status,
      note: effect.note,
    };
  });

  const usable = lines.filter((l) => l.contributionPct !== null);
  const totalCostChangePct =
    usable.length === 0
      ? null
      : usable.reduce((acc, l) => acc + (l.contributionPct as number), 0);

  const estimatedCost =
    scenario.baseCost !== null && totalCostChangePct !== null
      ? scenario.baseCost * (1 + totalCostChangePct / 100)
      : null;

  const completeness =
    lines.every((l) => l.status === 'ok') && !weightWarning
      ? 'complete'
      : lines.some((l) => l.contributionPct !== null)
        ? 'partial'
        : 'incomplete';

  if (completeness !== 'complete') {
    notes.push('핵심 지표가 일부 누락되어 확정값이 아닙니다.');
  }

  return {
    scenario,
    weightSum,
    weightWarning,
    lines: [...lines].sort(
      (a, b) => Math.abs(b.contributionPct ?? 0) - Math.abs(a.contributionPct ?? 0),
    ),
    totalCostChangePct,
    estimatedCost,
    riskLevel: classifyRisk(totalCostChangePct),
    completeness,
    notes,
  };
}

export const RISK_RULE_TEXT =
  'Risk Level은 추정 원가 변화율 절대값을 사용합니다. LOW < 3%, MEDIUM < 7%, HIGH < 12%, VERY_HIGH ≥ 12%. AI가 임의로 등급을 부여하지 않습니다.';
