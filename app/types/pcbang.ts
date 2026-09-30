/** PC방 조회·통계 (plink-api /api/admin-app/pcbangs, docs/admin-app/pcbangs-api.md) */

export interface ScheduleTime {
  start: string; // "HH:MM:SS"
  end: string; // "HH:MM:SS"
}

export interface PcbangPolicy {
  active?: boolean;
  scheduleTimes?: ScheduleTime[];
  wakeupTrial?: number;
  wakeupInterval?: number; // 초
  wakeupRetryDelay?: number; // 초 (1회 종료 후 미완료 시 재기동까지 대기 시간)
}

export interface Pcbang {
  id: string;
  name: string;
  address: string;
  phone: string;
  ip: string;
  policy: PcbangPolicy | null;
  /** 오늘(KST) 수행 수. 목록에만 있다 (pcbang_daily_stats, 최대 10분 지연) */
  today_execution_count?: number;
}

export interface PcbangAgent {
  id: string;
  ip: string;
  mac: string | null;
  daily_execution_limit: number;
  daily_execution_count?: number;
  blocked: boolean;
  created_at: string;
}

/** type=period: 날짜별 수행 수 */
export interface StatsPeriodItem {
  date: string; // KST YYYY-MM-DD
  count: number;
}

/** type=pcbang: PC방별 기간 합계 (count 내림차순) */
export interface StatsPcbangItem {
  pcbang_id: string;
  name: string;
  count: number;
}
