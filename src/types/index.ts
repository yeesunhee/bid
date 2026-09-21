export interface CategoryLevel1 {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CategoryLevel2 {
  id: string;
  parentId: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface PromptTemplate {
  id: string;
  categoryLevel2Id: string;
  title: string;
  subtitle: string;
  agentName: string;
  agentDescription: string;
  content: string;
  tags: string[];
}

export type AppViewMode = 'dashboard' | 'prompts';

export type EconomicProvider = 'ECOS' | 'EIA' | 'IMF';
export type EconomicFrequency = 'daily' | 'monthly' | 'other';
export type EconomicCategory =
  | 'inflation'
  | 'fx'
  | 'interest_rate'
  | 'energy'
  | 'nonferrous_metal'
  | 'steel_proxy';

export interface NormalizedIndicatorPoint {
  indicatorKey: string;
  provider: EconomicProvider;
  indicatorName: string;
  category: EconomicCategory;
  period: string;
  frequency: EconomicFrequency;
  value: number;
  unit: string;
  currency?: string;
  sourceTimestamp: string;
  fetchedAt: string;
  sourceReference: string;
  isEstimated: boolean;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface IndicatorCatalogItem {
  indicatorKey: string;
  provider: EconomicProvider;
  displayNameKo: string;
  category: EconomicCategory;
  frequency: EconomicFrequency;
  unit?: string;
  currency?: string;
  mapping: Record<string, unknown>;
  sourceUrl?: string;
  active: boolean;
  verifiedAt?: string;
}

export interface IndicatorSummary {
  catalog: IndicatorCatalogItem;
  latest?: NormalizedIndicatorPoint;
  changes: Record<string, number | null>;
  averages: Record<string, number | null>;
  series: NormalizedIndicatorPoint[];
  stale: boolean;
  status: 'ok' | 'stale' | 'missing' | 'error';
  statusMessage?: string;
  providerLabel: string;
}

export interface FactorItem {
  name: string;
  contributionPct: number;
  direction: 'up' | 'down';
}

export interface ExecutiveSummaryData {
  estimatedCostChangePct: number | null;
  riskLevel: RiskLevel | null;
  riskRuleText: string;
  topUpFactors: FactorItem[];
  topDownFactors: FactorItem[];
  oldestCorePeriod?: string;
  oldestCoreIndicator?: string;
  latestFetchedAt?: string;
  completeness: 'complete' | 'partial' | 'incomplete';
  notes: string[];
}

export interface BidCostLine {
  id: string;
  name: string;
  weightPct: number;
  indicatorKeys: string[];
  fxKey?: string;
}

export interface BidCostScenario {
  id: string;
  name: string;
  baseCost: number | null;
  baseFx: number | null;
  weights: BidCostLine[];
  riskWeights?: Record<string, number>;
}

export interface BidCostLineResult {
  id: string;
  name: string;
  weightPct: number;
  commodityEffectPct: number | null;
  fxEffectPct: number | null;
  combinedKrwEffectPct: number | null;
  contributionPct: number | null;
  status: 'ok' | 'partial' | 'incomplete';
  note?: string;
}

export interface BidCostCalculation {
  scenario: BidCostScenario;
  weightSum: number;
  weightWarning?: string;
  lines: BidCostLineResult[];
  totalCostChangePct: number | null;
  estimatedCost: number | null;
  riskLevel: RiskLevel | null;
  completeness: 'complete' | 'partial' | 'incomplete';
  notes: string[];
}

export interface DashboardPayload {
  summary: ExecutiveSummaryData;
  indicators: IndicatorSummary[];
  spread?: {
    value: number | null;
    unit: string;
    period?: string;
    status: 'ok' | 'missing';
  };
  bidCost: BidCostCalculation;
  providerErrors: { provider: EconomicProvider; message: string }[];
  refreshedAt?: string;
}
