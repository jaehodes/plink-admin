'use client';

import { ACTOR_TYPE_LABELS, BALANCE_TYPE_SHORT_LABELS, formatDateTime, formatPrice, type PriceHistory } from '../../types/agency';

interface PriceHistoryTableProps {
  prices: PriceHistory[];
  isLoading: boolean;
  error: string | null;
  /** 플랫폼 단가 이력이면 "설정자 단가" 대신 역전된 tier-2를 보여 준다 */
  platform?: boolean;
}

/** 단가 이력 표 (계정 단가 또는 플랫폼 단가) */
export default function PriceHistoryTable({ prices, isLoading, error, platform = false }: PriceHistoryTableProps) {
  const cols = platform ? 6 : 7;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">일시</th>
            <th className="px-4 py-2.5 text-left font-medium">유형</th>
            <th className="px-4 py-2.5 text-right font-medium">단가</th>
            {!platform && <th className="px-4 py-2.5 text-right font-medium">설정한 부모 단가</th>}
            <th className="px-4 py-2.5 text-left font-medium">역전 발생</th>
            <th className="px-4 py-2.5 text-left font-medium">처리</th>
            <th className="px-4 py-2.5 text-left font-medium">메모</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">불러오는 중...</td></tr>
          ) : error ? (
            <tr><td colSpan={cols} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
          ) : prices.length === 0 ? (
            <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">이력이 없습니다</td></tr>
          ) : prices.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50 align-top">
              <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(p.createdAt)}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">{BALANCE_TYPE_SHORT_LABELS[p.type]}</td>
              <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">{formatPrice(p.price)}</td>
              {!platform && <td className="px-4 py-2.5 text-right text-slate-500 whitespace-nowrap">{formatPrice(p.setterPrice)}</td>}
              <td className="px-4 py-2.5 text-xs">
                {p.invertedChildren.length === 0 ? (
                  <span className="text-slate-300">-</span>
                ) : (
                  <ul className="space-y-0.5 text-amber-700">
                    {p.invertedChildren.map((c) => (
                      <li key={c.userId} className="whitespace-nowrap">{c.name} {formatPrice(c.price)}</li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{ACTOR_TYPE_LABELS[p.actorType] ?? p.actorType}</td>
              <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[16rem] truncate" title={p.memo ?? ''}>{p.memo ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
