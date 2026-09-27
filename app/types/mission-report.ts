// 미션 신고(문의) 관련 타입 정의

export type MissionType = 'save' | 'quiz1' | 'quiz2' | 'direction';

export type MissionSubType = 'car' | 'bus';
export type ReportStatus = 'pending' | 'resolved';

// 목록용 간단 타입
export interface MissionReportSummary {
  id: number;
  missionType: MissionType;
  missionSubType?: MissionSubType;
  reason: string;              // Base64
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  rewardAmount?: number;
  rewardName?: string;         // Base64
  isReadByUser?: boolean;
  uname?: string;              // Base64
  orderer?: string;            // Base64
  mname?: string;              // 매체사명 (Base64)
  midx?: number;               // 매체사 번호
  placeName?: string;          // 플레이스명 (Base64)
}

// 퀴즈 객체 (mission 미션)
export interface ReportQuiz {
  id: number;
  question: string;  // Base64
  answer: string;    // Base64
  isActive?: boolean; // 활성화 여부
  reason?: string;   // 비활성화 사유 (Base64)
}

// 주차장 문제 객체 (direction/car 미션)
export interface ReportCarParking {
  id: number;
  parkingAnswer: string;  // Base64
  chosungRange: 'consonant' | 'vowel';
  isActive?: boolean; // 활성화 여부
  reason?: string;   // 비활성화 사유 (Base64)
}

// 상세용 전체 타입
export interface MissionReportDetail extends MissionReportSummary {
  missionId: number;
  submittedValue?: string;     // Base64
  adminNote?: string;          // Base64
  resolvedBy?: string;         // Base64
  rewardPerUnit?: number;
  placeName?: string;          // Base64
  placeUrl?: string;
  // quiz1/quiz2 미션
  quiz?: ReportQuiz;
  // direction/car 미션
  carParking?: ReportCarParking;
}

export interface MissionReportsResponse {
  ret: number;
  data: MissionReportSummary[];
  total: number;
}

export interface MissionReportDetailResponse {
  ret: number;
  data: MissionReportDetail;
}

// 타입/상태 라벨 헬퍼
export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  save: '플레이스 저장',
  quiz1: '유입미션(퀴즈1)',
  quiz2: '유입미션(퀴즈2)',
  direction: '길찾기 미션',
};

export const MISSION_SUB_TYPE_LABELS: Record<MissionSubType, string> = {
  car: '자동차',
  bus: '버스',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '접수됨',
  resolved: '처리완료',
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
};
