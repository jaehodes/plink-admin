'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Modal from '../../components/Modal';
import type { Pcbang, PcbangAgent, StatsPeriodItem } from '../../types/pcbang';
import { addDays, kstToday } from '../../utils/kstDate';
import { getPcbangDailyStats } from '../actions';
import DailyBarChart from '../components/DailyBarChart';
import DateRangeControls from '../components/DateRangeControls';

type Range = { from: string; to: string };

/**
 * 기간 통계를 불러온다. range나 agentId가 바뀌면 다시 부른다.
 * 결과에 요청 key를 붙여 두고, 지금 key와 다르면 불러오는 중으로 본다.
 */
function useDailyStats(pcbangId: string, range: Range, agentId?: string) {
  const key = `${pcbangId}|${range.from}|${range.to}|${agentId ?? ''}`;
  const [result, setResult] = useState<{ key: string; stats: StatsPeriodItem[] | null; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPcbangDailyStats(pcbangId, { ...range, agentId })
      .then((r) => !cancelled && setResult({ key, stats: r.ok ? r.data : null, error: r.ok ? null : r.error }))
      .catch(() => !cancelled && setResult({ key, stats: null, error: '통계를 불러오지 못했습니다.' }));
    return () => {
      cancelled = true;
    };
  }, [key, pcbangId, range, agentId]);

  const current = result?.key === key ? result : null;
  return { stats: current?.stats ?? null, error: current?.error ?? null };
}

/**
 * PC방 상세 (읽기 전용): 기본 정보, 기간 수행 추이, 에이전트 목록.
 * 에이전트 통계는 상단에서 고른 기간을 그대로 쓴다.
 */
export default function PcbangDetailClient({
  pcbang,
  agents,
  agentsError,
}: {
  pcbang: Pcbang;
  agents: PcbangAgent[] | null;
  agentsError: string | null;
}) {
  const [range, setRange] = useState<Range>(() => {
    const today = kstToday();
    return { from: addDays(today, -6), to: today };
  });
  const [statsAgent, setStatsAgent] = useState<PcbangAgent | null>(null);
  const { stats, error } = useDailyStats(pcbang.id, range);

  const total = (stats ?? []).reduce((sum, d) => sum + d.count, 0);
  const withMac = (agents ?? []).filter((a) => a.mac?.trim()).length;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/pcbangs" className="text-sm text-blue-600 hover:underline">← PC방 목록</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{pcbang.name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {[pcbang.address, pcbang.phone, pcbang.ip].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">
            일별 수행 추이 {stats && <span className="ml-1 font-normal text-slate-500">합계 {total.toLocaleString()}</span>}
          </h2>
          <DateRangeControls from={range.from} to={range.to} onChange={setRange} />
        </div>
        {error ? (
          <p className="py-8 text-center text-sm text-red-500">{error}</p>
        ) : !stats ? (
          <p className="py-8 text-center text-sm text-slate-400">불러오는 중...</p>
        ) : (
          <DailyBarChart data={stats} />
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">에이전트</h2>
          {agents && (
            <span className="text-xs text-slate-500">
              전체 {agents.length} · MAC 수집됨 {withMac} · 수집 대기 {agents.length - withMac}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">IP</th>
                <th className="px-4 py-2.5 text-left font-medium">MAC</th>
                <th className="px-4 py-2.5 text-right font-medium">오늘 / 한도</th>
                <th className="px-4 py-2.5 text-left font-medium">상태</th>
                <th className="px-4 py-2.5 text-right font-medium">통계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentsError ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-red-500">{agentsError}</td></tr>
              ) : !agents || agents.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">등록된 에이전트가 없습니다</td></tr>
              ) : agents.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{a.ip}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{a.mac?.trim() || <span className="font-sans text-slate-400">수집 대기</span>}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                    {(a.daily_execution_count ?? 0).toLocaleString()} / {a.daily_execution_limit.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${a.blocked ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                      {a.blocked ? '차단됨' : '정상'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setStatsAgent(a)} className="text-xs text-blue-600 hover:underline">보기</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {statsAgent && (
        <AgentStatsModal pcbangId={pcbang.id} agent={statsAgent} range={range} onClose={() => setStatsAgent(null)} />
      )}
    </div>
  );
}

function AgentStatsModal({ pcbangId, agent, range, onClose }: { pcbangId: string; agent: PcbangAgent; range: Range; onClose: () => void }) {
  const { stats, error } = useDailyStats(pcbangId, range, agent.id);

  return (
    <Modal title={`에이전트 통계 · ${agent.ip}`} onClose={onClose} maxWidth="max-w-2xl">
      <p className="text-sm text-slate-500">{range.from} ~ {range.to}</p>
      {error ? (
        <p className="py-8 text-center text-sm text-red-500">{error}</p>
      ) : !stats ? (
        <p className="py-8 text-center text-sm text-slate-400">불러오는 중...</p>
      ) : (
        <DailyBarChart data={stats} />
      )}
    </Modal>
  );
}
