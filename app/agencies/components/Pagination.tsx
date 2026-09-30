'use client';

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

/** 표 아래 이전/다음 페이지 이동 */
export default function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-2 text-sm">
      <button className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40" disabled={page <= 1} onClick={() => onChange(page - 1)}>이전</button>
      <span className="text-slate-500">{page} / {totalPages}</span>
      <button className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>다음</button>
    </div>
  );
}
