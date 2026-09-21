import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { IndicatorSummary } from '../../types';

export default function TrendChart({
  items,
  months = 24,
}: {
  items: IndicatorSummary[];
  months?: number;
}) {
  const allPeriods = Array.from(
    new Set(items.flatMap((item) => item.series.map((p) => p.period))),
  ).sort();
  const limited = allPeriods.slice(-Math.max(months, 30));
  const data = limited.map((period) => {
    const row: Record<string, string | number | null> = { period };
    for (const item of items) {
      row[item.catalog.indicatorKey] = item.series.find((p) => p.period === period)?.value ?? null;
    }
    return row;
  });

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">표시할 시계열이 없습니다.</p>;
  }

  const colors = ['#38bdf8', '#f59e0b', '#34d399', '#f472b6', '#a78bfa'];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
            formatter={(value) =>
              value === null || value === undefined ? 'N/A' : Number(value).toLocaleString()
            }
          />
          {items.map((item, i) => (
            <Line
              key={item.catalog.indicatorKey}
              type="monotone"
              dataKey={item.catalog.indicatorKey}
              name={item.catalog.displayNameKo}
              stroke={colors[i % colors.length]}
              dot={false}
              connectNulls={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
