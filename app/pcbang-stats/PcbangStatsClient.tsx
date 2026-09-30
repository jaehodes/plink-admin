'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getAllPcbangsDailyStats, getPcbangTotals } from '../pcbangs/actions';
import DailyBarChart, { chartColors, tooltipStyle } from '../pcbangs/components/DailyBarChart';
import DateRangeControls from '../pcbangs/components/DateRangeControls';
import type { StatsPcbangItem, StatsPeriodItem } from '../types/pcbang';
import { addDays, kstToday } from '../utils/kstDate';

const cardClass = 'bg-white rounded-xl border border-slate-200 overflow-hidden';
const cardHeadClass = 'px-4 py-3 border-b border-slate-100 text-sm font-semibold text-gray-900';

/** 전체 PC방 수행 통계: 날짜별 합계와 PC방별 합계 */
export default function PcbangStatsClient() {
  const [range, setRange] = useState(() => {
    const today = kstToday();
    return { from: addDays(today, -6), to: today };
  });
  // 결과에 요청 기간을 붙여 두고, 지금 기간과 다르면 불러오는 중으로 본다
  const [result, setResult] = useState<{
    range: typeof range;
    daily: StatsPeriodItem[] | null;
    totals: StatsPcbangItem[] | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllPcbangsDailyStats(range), getPcbangTotals(range)])
      .then(([d, t]) => {
        if (cancelled) return;
        const error = !d.ok || !t.ok ? (d.error ?? t.error) : null;
        setResult({ range, daily: error ? null : d.data, totals: error ? null : t.data, error });
      })
      .catch(() => !cancelled && setResult({ range, daily: null, totals: null, error: '통계를 불러오지 못했습니다.' }));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const current = result?.range === range ? result : null;
  const daily = current?.daily ?? null;
  const totals = current?.totals ?? null;
  const error = current?.error ?? null;
  const loading = !current;
  const total = (daily ?? []).reduce((sum, d) => sum + d.count, 0);
  // 순위 차트 높이는 PC방 수에 비례한다(막대당 36px, 최소 120px)
  const rankingHeight = Math.max(120, (totals?.length ?? 0) * 36 + 24);

  const placeholder = (colSpan?: number) => {
    const text = error ?? '불러오는 중...';
    const cls = `px-4 py-8 text-center text-sm ${error ? 'text-red-500' : 'text-slate-400'}`;
    return colSpan ? <tr><td colSpan={colSpan} className={cls}>{text}</td></tr> : <p className={cls}>{text}</p>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PC방 통계</h1>
          <p className="text-sm text-slate-500 mt-1">PC방 PC가 수행한 미션(퀴즈1·퀴즈2·길찾기) 수입니다.</p>
        </div>
        <DateRangeControls from={range.from} to={range.to} onChange={setRange} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cardClass}>
          <div className={cardHeadClass}>일별 수행 추이 (전체)</div>
          <div className="p-4">{loading || error ? placeholder() : <DailyBarChart data={daily ?? []} />}</div>
        </div>

        <div className={cardClass}>
          <div className={cardHeadClass}>PC방별 수행 순위</div>
          <div className="p-4">
            {loading || error ? placeholder() : totals && totals.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">등록된 PC방이 없습니다</p>
            ) : (
              <ResponsiveContainer width="100%" height={rankingHeight}>
                <BarChart data={totals ?? []} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: chartColors.tick }} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: chartColors.tick }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: chartColors.cursor }} contentStyle={tooltipStyle} formatter={(v) => [(v as number).toLocaleString(), '수행']} />
                  <Bar dataKey="count" fill={chartColors.bar} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cardClass}>
          <div className={cardHeadClass}>일별 수행 수</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">날짜</th>
                <th className="px-4 py-2.5 text-right font-medium">수행</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading || error ? placeholder(2) : (
                <>
                  {(daily ?? []).map((d) => (
                    <tr key={d.date}>
                      <td className="px-4 py-2 text-slate-600">{d.date}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{d.count.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-4 py-2">합계</td>
                    <td className="px-4 py-2 text-right tabular-nums">{total.toLocaleString()}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className={cardClass}>
          <div className={cardHeadClass}>PC방별 수행 합계</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium w-12">#</th>
                <th className="px-4 py-2.5 text-left font-medium">PC방</th>
                <th className="px-4 py-2.5 text-right font-medium">수행</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading || error ? placeholder(3) : totals && totals.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">등록된 PC방이 없습니다</td></tr>
              ) : (totals ?? []).map((r, i) => (
                <tr key={r.pcbang_id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/pcbangs/${r.pcbang_id}`} className="text-gray-900 hover:text-blue-600">{r.name}</Link>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
