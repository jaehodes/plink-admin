'use client';

import { useEffect, useState } from 'react';
import { selectClass } from '../components/Modal';
import { getPcbangTotals } from '../pcbangs/actions';
import type { StatsPcbangItem } from '../types/pcbang';
import { kstToday, lastDayOfMonth } from '../utils/kstDate';

// 수행 1건당 단가(원). 아직 DB에 두지 않은 화면 계산용 값이다. 지급 근거로 쓰게 되면 단가 이력과 정산 확정을 DB로 옮긴다
const RATE_PCBANG = 10;
const RATE_PARTNER = 2.5;
const RATE_DEV = 2.5;

/** 정산액은 정수 원으로 반올림해 표기한다(단가 2.5원 × 홀수 = .5원 방지) */
const won = (n: number) => Math.round(n).toLocaleString();

const cardClass = 'bg-white rounded-xl border border-slate-200 overflow-hidden';
const cardHeadClass = 'px-4 py-3 border-b border-slate-100 text-sm font-semibold text-gray-900';
const thClass = 'px-4 py-2.5 font-medium';
const tdNum = 'px-4 py-2 text-right tabular-nums';

/**
 * 월 단위(1일~말일) PC방 정산. PC방별 기간 합계(/pcbang-stats?type=pcbang)로 계산한다.
 * - PC방별: 수행 수 × 10원
 * - 파트너사/개발사(각 1개사): 전체 PC방 수행 합계 × 2.5원
 */
export default function PcbangSettlementClient() {
  const thisMonth = kstToday().slice(0, 7);
  const [month, setMonth] = useState(thisMonth); // YYYY-MM
  // 결과에 요청 월을 붙여 두고, 지금 월과 다르면 불러오는 중으로 본다
  const [result, setResult] = useState<{ month: string; rows: StatsPcbangItem[] | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    getPcbangTotals({ from: `${month}-01`, to: lastDayOfMonth(month) })
      .then((r) => !cancelled && setResult({ month, rows: r.ok ? r.data : null, error: r.ok ? null : r.error }))
      .catch(() => !cancelled && setResult({ month, rows: null, error: '정산 자료를 불러오지 못했습니다.' }));
    return () => {
      cancelled = true;
    };
  }, [month]);

  const current = result?.month === month ? result : null;
  const rows = current?.rows ?? null;
  const error = current?.error ?? null;

  const total = (rows ?? []).reduce((sum, r) => sum + r.count, 0);

  const placeholder = (colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className={`px-4 py-8 text-center ${error ? 'text-red-500' : 'text-slate-400'}`}>{error ?? '불러오는 중...'}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PC방 정산</h1>
          <p className="text-sm text-slate-500 mt-1">월 수행 수에 단가를 곱한 참고 금액입니다. 이번 달은 오늘까지 집계됩니다.</p>
        </div>
        <input type="month" value={month} max={thisMonth} onChange={(e) => setMonth(e.target.value)} className={selectClass} aria-label="정산 월" />
      </div>

      <div className={cardClass}>
        <div className={cardHeadClass}>PC방 정산 (단가 {RATE_PCBANG}원)</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className={`${thClass} text-left`}>PC방</th>
              <th className={`${thClass} text-right`}>수행</th>
              <th className={`${thClass} text-right`}>정산액(원)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows ? placeholder(3) : rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">등록된 PC방이 없습니다</td></tr>
            ) : (
              <>
                {rows.map((r) => (
                  <tr key={r.pcbang_id}>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className={tdNum}>{r.count.toLocaleString()}</td>
                    <td className={tdNum}>{won(r.count * RATE_PCBANG)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-2">합계</td>
                  <td className={tdNum}>{total.toLocaleString()}</td>
                  <td className={tdNum}>{won(total * RATE_PCBANG)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className={cardClass}>
        <div className={cardHeadClass}>파트너사 / 개발사 정산</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className={`${thClass} text-left`}>구분</th>
              <th className={`${thClass} text-right`}>수행</th>
              <th className={`${thClass} text-right`}>단가(원)</th>
              <th className={`${thClass} text-right`}>정산액(원)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows ? placeholder(4) : (
              [
                { label: '파트너사', rate: RATE_PARTNER },
                { label: '개발사', rate: RATE_DEV },
              ].map((r) => (
                <tr key={r.label}>
                  <td className="px-4 py-2 font-medium">{r.label}</td>
                  <td className={tdNum}>{total.toLocaleString()}</td>
                  <td className={tdNum}>{r.rate}</td>
                  <td className={tdNum}>{won(total * r.rate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
