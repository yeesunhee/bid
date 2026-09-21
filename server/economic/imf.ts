import type { NormalizedIndicatorPoint } from '../../src/types/index.ts';
import type { CatalogSeed } from './catalog.ts';

function startPeriod(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return `${d.getFullYear()}-M${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeImfPeriod(raw: string): string {
  const m = raw.match(/^(\d{4})-M(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  return raw;
}

export async function fetchImfSeries(item: CatalogSeed): Promise<NormalizedIndicatorPoint[]> {
  const mapping = item.mapping as {
    seriesKey: string;
    indicator: string;
  };
  const url = new URL(
    `https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.RES/PCPS/~/${mapping.seriesKey}`,
  );
  url.searchParams.set('c[TIME_PERIOD]', `ge:${startPeriod(28)}`);
  const res = await fetch(url, { headers: { Accept: 'text/csv' } });
  if (!res.ok) {
    throw new Error(`IMF HTTP ${res.status}`);
  }
  const csv = await res.text();
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('IMF 응답에 관측값이 없습니다.');
  }
  const header = lines[0].split(',');
  const idxPeriod = header.indexOf('TIME_PERIOD');
  const idxValue = header.indexOf('OBS_VALUE');
  const idxIndicator = header.indexOf('INDICATOR');
  if (idxPeriod < 0 || idxValue < 0) {
    throw new Error('IMF CSV 헤더를 해석하지 못했습니다.');
  }
  const fetchedAt = new Date().toISOString();
  const points: NormalizedIndicatorPoint[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    const periodRaw = cols[idxPeriod];
    const valueRaw = cols[idxValue];
    const indicator = idxIndicator >= 0 ? cols[idxIndicator] : mapping.indicator;
    if (!periodRaw || valueRaw === undefined || valueRaw === '') continue;
    const num = Number(valueRaw);
    if (!Number.isFinite(num)) continue;
    const period = normalizeImfPeriod(periodRaw);
    points.push({
      indicatorKey: item.indicatorKey,
      provider: 'IMF',
      indicatorName: item.displayNameKo,
      category: item.category,
      period,
      frequency: 'monthly',
      value: num,
      unit: item.unit || 'USD/mt',
      currency: 'USD',
      sourceTimestamp: period,
      fetchedAt,
      sourceReference: `IMF.RES:PCPS:${indicator}:${mapping.seriesKey}`,
      isEstimated: false,
    });
  }
  if (points.length === 0) {
    throw new Error('IMF 관측값을 파싱하지 못했습니다.');
  }
  return points.sort((a, b) => a.period.localeCompare(b.period));
}
