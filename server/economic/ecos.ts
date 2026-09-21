import crypto from 'node:crypto';
import type { NormalizedIndicatorPoint } from '../../src/types/index.ts';
import type { CatalogSeed } from './catalog.ts';

const ECOS_BASE = 'https://ecos.bok.or.kr/api';

function ecosKey(): string {
  const key = process.env.ECOS_API_KEY?.trim();
  if (!key) throw new Error('ECOS_API_KEY가 설정되지 않았습니다.');
  return key;
}

function formatRange(frequency: 'daily' | 'monthly', monthsBack: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - monthsBack);
  if (frequency === 'daily') {
    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return { start: fmt(start), end: fmt(end) };
  }
  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

function normalizePeriod(raw: string, frequency: 'daily' | 'monthly'): string {
  if (frequency === 'daily' && raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  if (frequency === 'monthly' && raw.length === 6) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
  }
  return raw;
}

export async function fetchEcosSeries(item: CatalogSeed): Promise<NormalizedIndicatorPoint[]> {
  const mapping = item.mapping as {
    statisticTableCode: string;
    itemCode: string;
    cycle: string;
  };
  const frequency = item.frequency === 'daily' ? 'daily' : 'monthly';
  const monthsBack = frequency === 'daily' ? 14 : 28;
  const { start, end } = formatRange(frequency, monthsBack);
  const key = ecosKey();
  const itemSeg = encodeURIComponent(mapping.itemCode);
  const url = `${ECOS_BASE}/StatisticSearch/${key}/json/kr/1/10000/${mapping.statisticTableCode}/${mapping.cycle}/${start}/${end}/${itemSeg}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`ECOS HTTP ${res.status}`);
  }
  const payload = (await res.json()) as {
    RESULT?: { CODE?: string; MESSAGE?: string };
    StatisticSearch?: { row?: Array<Record<string, string>> };
  };
  if (payload.RESULT?.CODE) {
    throw new Error(payload.RESULT.MESSAGE || payload.RESULT.CODE);
  }
  const rows = payload.StatisticSearch?.row ?? [];
  const fetchedAt = new Date().toISOString();
  const points: NormalizedIndicatorPoint[] = [];
  for (const row of rows) {
    const rawValue = row.DATA_VALUE;
    const num = Number(rawValue);
    if (!Number.isFinite(num)) continue;
    const period = normalizePeriod(row.TIME, frequency);
    points.push({
      indicatorKey: item.indicatorKey,
      provider: 'ECOS',
      indicatorName: item.displayNameKo,
      category: item.category,
      period,
      frequency,
      value: num,
      unit: row.UNIT_NAME || item.unit || '',
      currency: item.currency,
      sourceTimestamp: period,
      fetchedAt,
      sourceReference: `${row.STAT_CODE}:${row.ITEM_CODE1}:${row.ITEM_NAME1}`,
      isEstimated: false,
    });
  }
  return points.sort((a, b) => a.period.localeCompare(b.period));
}

export function observationId(indicatorKey: string, period: string): string {
  return crypto.createHash('sha1').update(`${indicatorKey}|${period}`).digest('hex');
}
