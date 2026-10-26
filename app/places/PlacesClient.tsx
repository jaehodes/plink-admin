'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPlaces } from './actions';
import Pagination from '../agencies/components/Pagination';
import type { Place } from '../types/place';

const PAGE_SIZE = 50;

const kstDate = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(iso));

function Thumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
        <span className="text-gray-400 text-xs">없음</span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={src} alt={alt} className="w-10 h-10 rounded object-cover" onError={() => setError(true)} />
  );
}

/** places 테이블 목록(등록일 내림차순). 지금은 이름·썸네일·링크만 보여 준다 */
export default function PlacesClient() {
  const [page, setPage] = useState(1);
  const [places, setPlaces] = useState<Place[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await getPlaces({ page, limit: PAGE_SIZE });
      if (!r.ok || !r.data) {
        setError(r.error);
        return;
      }
      setPlaces(r.data.places);
      setTotal(r.data.total);
    } catch {
      setError('플레이스 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">플레이스</h1>
        <p className="text-sm text-slate-500 mt-1">발주·분석으로 등록된 네이버 플레이스입니다.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex">
          <span className="text-xs text-slate-400 ml-auto">총 {total.toLocaleString()}곳</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium w-16">썸네일</th>
                <th className="px-4 py-2.5 text-left font-medium">이름</th>
                <th className="px-4 py-2.5 text-left font-medium">링크</th>
                <th className="px-4 py-2.5 text-left font-medium">place ID</th>
                <th className="px-4 py-2.5 text-left font-medium">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">불러오는 중...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
              ) : places.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">등록된 플레이스가 없습니다</td></tr>
              ) : places.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2"><Thumbnail src={p.thumbnail} alt={p.name} /></td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{p.name || <span className="text-slate-400">(이름 없음)</span>}</div>
                    {p.category && <div className="text-xs text-slate-400">{p.category}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap space-x-2">
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">PC</a>}
                    {p.mobileUrl && <a href={p.mobileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">모바일</a>}
                    {!p.url && !p.mobileUrl && <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{p.id}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{kstDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </div>
  );
}
