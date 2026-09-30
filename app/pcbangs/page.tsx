import type { Metadata } from "next";
import Link from "next/link";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import { getPcbangs } from "./actions";

export const metadata: Metadata = {
  title: 'PC방 관리 - 플링크 관리자',
  description: '플링크 PC방 목록',
  robots: "noindex, nofollow",
};

export default async function PcbangsPage() {
  await requireAuth();
  const result = await getPcbangs();
  const pcbangs = result.data ?? [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PC방 관리</h1>
          <p className="text-sm text-slate-500 mt-1">등록된 PC방과 오늘 수행 수입니다. 오늘 수행은 최대 10분 늦게 반영됩니다.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">이름</th>
                  <th className="px-4 py-2.5 text-left font-medium">주소</th>
                  <th className="px-4 py-2.5 text-left font-medium">전화</th>
                  <th className="px-4 py-2.5 text-left font-medium">IP</th>
                  <th className="px-4 py-2.5 text-right font-medium">오늘 수행</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!result.ok ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-red-500">{result.error}</td></tr>
                ) : pcbangs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">등록된 PC방이 없습니다</td></tr>
                ) : pcbangs.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">
                      <Link href={`/pcbangs/${p.id}`} className="text-gray-900 hover:text-blue-600">{p.name}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{p.address}</td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{p.phone}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{p.ip}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{(p.today_execution_count ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
