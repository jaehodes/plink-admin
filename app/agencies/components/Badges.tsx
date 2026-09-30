import { blockedLabel, type AgencyUser } from '../../types/agency';

const TIER_COLORS: Record<number, string> = {
  1: 'bg-indigo-100 text-indigo-700',
  2: 'bg-sky-100 text-sky-700',
  3: 'bg-slate-100 text-slate-700',
};

export function TierBadge({ tier }: { tier: number }) {
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${TIER_COLORS[tier] ?? TIER_COLORS[3]}`}>tier-{tier}</span>;
}

/** 사용 중 / 차단(관리자·상위 대리점·시스템) / 상위 계정 차단 */
export function StatusBadge({ user }: { user: Pick<AgencyUser, 'blocked' | 'blockedByType' | 'blockedByAncestor'> }) {
  const inactive = user.blocked || user.blockedByAncestor;
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${inactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
      {blockedLabel(user)}
    </span>
  );
}
