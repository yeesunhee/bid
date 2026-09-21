import type { IndicatorSummary } from '../../types';

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return value.toLocaleString('ko-KR', { maximumFractionDigits: digits });
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function periodLabel(summary: IndicatorSummary): string {
  if (!summary.latest) return '기준시점 없음';
  return summary.catalog.frequency === 'monthly'
    ? `기준월 ${summary.latest.period}`
    : `기준일 ${summary.latest.period}`;
}

export function pctClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-slate-400';
  if (value > 0) return 'text-rose-300';
  if (value < 0) return 'text-emerald-300';
  return 'text-slate-300';
}
