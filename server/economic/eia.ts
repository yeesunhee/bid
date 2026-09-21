import type { NormalizedIndicatorPoint } from '../../src/types/index.ts';
import type { CatalogSeed } from './catalog.ts';

const EIA_BASE = 'https://api.eia.gov/v2';

function eiaKey(): string {
  const key = process.env.EIA_API_KEY?.trim();
  if (!key) throw new Error('EIA_API_KEY가 설정되지 않았습니다.');
  return key;
}

export async function fetchEiaSeries(item: CatalogSeed): Promise<NormalizedIndicatorPoint[]> {
  const mapping = item.mapping as {
    route: string;
    frequency: string;
    dataField: string;
    facets: Record<string, string[]>;
  };
  const start = new Date();
  start.setMonth(start.getMonth() - 14);
  const startStr = start.toISOString().slice(0, 10);
  const url = new URL(`${EIA_BASE}/${mapping.route}/data/`);
  url.searchParams.set('api_key', eiaKey());
  url.searchParams.set('frequency', mapping.frequency);
  url.searchParams.set('data[0]', mapping.dataField);
  url.searchParams.set('start', startStr);
  url.searchParams.set('sort[0][column]', 'period');
  url.searchParams.set('sort[0][direction]', 'asc');
  url.searchParams.set('length', '5000');
  for (const [facet, values] of Object.entries(mapping.facets ?? {})) {
    values.forEach((value) => url.searchParams.append(`facets[${facet}][]`, value));
  }

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`EIA HTTP ${res.status}`);
  }
  const payload = (await res.json()) as {
    response?: {
      data?: Array<Record<string, unknown>>;
      units?: string;
    };
    error?: string;
  };
  if (payload.error) {
    throw new Error(String(payload.error));
  }
  const rows = payload.response?.data ?? [];
  const fetchedAt = new Date().toISOString();
  const points: NormalizedIndicatorPoint[] = [];
  for (const row of rows) {
    const raw = row[mapping.dataField] ?? row.value;
    const num = Number(raw);
    if (!Number.isFinite(num)) continue;
    const period = String(row.period ?? '');
    if (!period) continue;
    const unit = String(row.units ?? payload.response?.units ?? item.unit ?? '');
    points.push({
      indicatorKey: item.indicatorKey,
      provider: 'EIA',
      indicatorName: item.displayNameKo,
      category: item.category,
      period,
      frequency: item.frequency,
      value: num,
      unit,
      currency: item.currency,
      sourceTimestamp: period,
      fetchedAt,
      sourceReference: `${mapping.route}:${JSON.stringify(mapping.facets)}`,
      isEstimated: false,
    });
  }
  return points.sort((a, b) => a.period.localeCompare(b.period));
}
