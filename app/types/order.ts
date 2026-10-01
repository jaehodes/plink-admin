// 발주 관련 타입 정의

export type OrderType = 'save' | 'quiz1' | 'quiz2' | 'direction';
export type OrderStatus = 'pending' | 'progress' | 'completed' | 'cancelled';

export interface KeywordOrder {
  id: number;
  keyword: string; // Base64 인코딩
  rank?: number; // 옵션 (API에서 반환하지 않을 수 있음)
  dailyCount: number;
  totalCount: number;
  completedCount: number;
}

export interface Quiz {
  id: number;
  question: string; // Base64 인코딩
  answer: string; // Base64 인코딩
  tab: 'home' | 'news' | 'menu' | 'review' | 'map' | 'around' | 'info';
  isActive?: boolean; // 활성화 여부
  reason?: string;   // 비활성화 사유 (Base64 인코딩)
}

export interface CarMission {
  id: number;
  parkingAnswer: string; // Base64 인코딩
  chosungRange: 'consonant' | 'vowel';
  isActive?: boolean; // 활성화 여부
  reason?: string;   // 비활성화 사유 (Base64 인코딩)
}

export interface MissionRatio {
  car: number;
  bus: number;
}

export interface DeferredChanges {
  endDate?: string;          // 수정 예정 종료일 (YYYY-MM-DD)
  totalDailyCount?: number;  // 수정 예정 총 수량
}

export interface Order {
  id: string;
  type: OrderType;
  placeName: string; // Base64 인코딩
  placeId: string;
  placeUrl: string; // 네이버 플레이스 URL
  mobileUrl: string; // 모바일 플레이스 URL
  thumbnail: string;
  category: string; // Base64 인코딩
  orderer: string; // Base64 인코딩 - 발주사
  keywords: KeywordOrder[];
  startDate: string;
  endDate: string;
  totalDailyCount: number;
  totalCount: number;
  completedCount: number;
  status: OrderStatus;
  createdAt: string;
  quizzes?: Quiz[];
  carMissions?: CarMission[];
  missionRatio?: MissionRatio;
  deferredChanges?: DeferredChanges;  // 수정 예정 내용 (다음날부터 반영)
  deferredQuizzes?: Quiz[];           // 변경 예정 퀴즈 목록
  cancelledBy?: string;   // 취소 처리자
  cancelledAt?: string;   // 취소 일시 (ISO 8601)
}

export interface OrdersResponse {
  ret: number;
  orders: Order[];
  total: number;
}

// 타입/상태 라벨 헬퍼
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  save: '플레이스 저장',
  quiz1: '유입미션(퀴즈1)',
  quiz2: '유입미션(퀴즈2)',
  direction: '길찾기 미션',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '대기중',
  progress: '진행중',
  completed: '완료',
  cancelled: '취소됨',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};
