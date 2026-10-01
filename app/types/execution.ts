export type ExecutionStatus = 'progress' | 'completed' | 'skipped' | 'failed' | 'timeout';
export type ExecutionType = 'quiz1' | 'quiz2' | 'direction';
export type ExecutionSubType = 'car' | 'bus';

export type MissionTab = 'home' | 'news' | 'menu' | 'review' | 'map' | 'around' | 'info';
export type ChosungRange = 'consonant' | 'vowel';

// Quiz 객체 (quiz1/quiz2 타입용)
export interface Quiz {
  question: string;
  answer: string;
  tab: MissionTab;
}

// CarMission 객체 (direction 타입용)
export interface CarMission {
  parkingAnswer: string;
  chosungRange: ChosungRange;
}

export interface Execution {
  id: string;
  orderId: string;
  uname: string;
  kind: 'app' | 'pcbang';  // 수행자 구분
  affiliation: string;     // 소속: PC방 이름 또는 '앱' (Base64 인코딩)
  placeName: string;
  keyword: string;
  type: ExecutionType;
  subType?: ExecutionSubType;  // direction 타입일 때만 (car | bus)
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface ExecutionDetail extends Execution {
  placeId: string;
  submittedValue?: string;  // 사용자가 제출한 URL (direction/bus만)
  failReason?: string;
  // quiz1/quiz2 타입 필드
  quizzes?: Quiz[];
  // direction 타입 필드
  carMission?: CarMission;
}

export interface ExecutionsResponse {
  ret: number;
  executions: Execution[];
  total: number;
}

export const EXECUTION_TYPE_LABELS: Record<ExecutionType, string> = {
  quiz1: '유입미션(퀴즈1)',
  quiz2: '유입미션(퀴즈2)',
  direction: '길찾기 미션',
};

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  progress: '진행중',
  completed: '완료',
  skipped: '포기',
  failed: '실패',
  timeout: '타임오버',
};

export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string> = {
  progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  skipped: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  timeout: 'bg-orange-100 text-orange-800',
};
