'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { StatsPeriodItem } from '../../types/pcbang';
import { shortDate } from '../../utils/kstDate';

export const chartColors = {
  bar: '#2563eb', // blue-600
  grid: '#e2e8f0', // slate-200
  tick: '#64748b', // slate-500
  cursor: '#f1f5f9', // slate-100
};

export const tooltipStyle = {
  background: '#ffffff',
  border: `1px solid ${chartColors.grid}`,
  borderRadius: 8,
  fontSize: 12,
} as const;

/** 일별 수행 수 막대차트. PC방 통계·상세·에이전트 통계가 함께 쓴다 */
export default function DailyBarChart({ data, height = 260 }: { data: StatsPeriodItem[]; height?: number }) {
  const chartData = data.map((d) => ({ ...d, label: shortDate(d.date) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: chartColors.tick }} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: chartColors.tick }} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: chartColors.cursor }} contentStyle={tooltipStyle} formatter={(v) => [(v as number).toLocaleString(), '수행']} />
        <Bar dataKey="count" fill={chartColors.bar} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
