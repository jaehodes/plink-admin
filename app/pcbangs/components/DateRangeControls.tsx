'use client';

import { selectClass } from '../../components/Modal';
import { addDays, kstToday } from '../../utils/kstDate';

const presetClass = 'px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors';

/** 통계 기간(from~to) 선택. 시작·종료일과 최근 7/30일 프리셋 */
export default function DateRangeControls({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  const today = kstToday();
  const preset = (days: number) => onChange({ from: addDays(today, -(days - 1)), to: today });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={from} max={to} onChange={(e) => onChange({ from: e.target.value, to })} className={selectClass} />
      <span className="text-sm text-slate-400">~</span>
      <input type="date" value={to} min={from} max={today} onChange={(e) => onChange({ from, to: e.target.value })} className={selectClass} />
      <button type="button" onClick={() => preset(7)} className={presetClass}>최근 7일</button>
      <button type="button" onClick={() => preset(30)} className={presetClass}>최근 30일</button>
    </div>
  );
}
