/** 통계 기간 계산용 KST 날짜 헬퍼. 서버 통계가 KST 기준이라 화면도 KST로 맞춘다. */

/** KST 기준 오늘(YYYY-MM-DD) */
export function kstToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

/** YYYY-MM-DD에 일수를 더한다(UTC 계산이라 DST 영향 없음) */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** "2026-07-26" → "7.26" (차트 축 라벨용) */
export function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}.${Number(d)}`;
}

/** "YYYY-MM" → 그 달 말일 "YYYY-MM-DD" */
export function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const day = new Date(Date.UTC(y, m, 0)).getUTCDate(); // m은 1-based → Date.UTC(y, m, 0)이 m월 말일
  return `${ym}-${String(day).padStart(2, '0')}`;
}
