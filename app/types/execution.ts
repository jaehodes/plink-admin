export type ExecutionStatus = 'progress' | 'completed' | 'skipped' | 'failed' | 'timeout';
export type ExecutionType = 'quiz1' | 'quiz2' | 'direction' | 'shopping';
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
  placeName: string;       // 쇼핑은 빈 문자열
  keyword: string;         // 플레이스는 광고 키워드, 쇼핑은 미션에 정한 검색어(FLOW1 랜딩은 빈 문자열)
  productName?: string;    // 쇼핑만 (Base64)
  type: ExecutionType;
  subType?: ExecutionSubType;  // direction 타입일 때만 (car | bus)
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

/** 쇼핑 실행의 미션 정보. productName·sellerName·keyword·fallbackKeyword는 Base64 */
export interface ShoppingExecutionInfo {
  productName: string;
  sellerName: string;
  productMid: string;
  catalogMid: string | null;   // 있으면 가격비교
  productUrl: string;
  landingUrl: string | null;   // 있으면 FLOW1(랜딩), 없으면 FLOW2(통합검색)
  keyword: string | null;      // FLOW1은 null
  fallbackKeyword: string | null;
}

/** 쇼핑 수행 결과(완료 때 agent가 보낸 것). keyword만 Base64 */
export interface ShoppingExecutionResult {
  keyword?: string | null;
  usedFallback?: boolean | null;
  page?: number | null;
  position?: number | null;
  cardKind?: string | null;    // catalog(원부) | product(상품)
  reviewTab?: boolean | null;
  dwellSeconds?: number | null;
}

export interface ExecutionDetail extends Execution {
  placeId: string;
  submittedValue?: string;  // 사용자가 제출한 URL (direction/bus만)
  failReason?: string;
  // quiz1/quiz2 타입 필드
  quizzes?: Quiz[];
  // direction 타입 필드
  carMission?: CarMission;
  // shopping 타입 필드
  shopping?: ShoppingExecutionInfo;
  result?: ShoppingExecutionResult | null;
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
  shopping: '쇼핑',
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
