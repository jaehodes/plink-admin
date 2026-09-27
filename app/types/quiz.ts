// 퀴즈/주차장 관리 관련 타입 정의

export type QuizTab = 'home' | 'news' | 'menu' | 'review' | 'map' | 'around' | 'info';
export type MissionProblemType = 'quiz' | 'parking';

export interface QuizItem {
  id: number;
  question: string;   // Base64
  answer: string;     // Base64
  tab: QuizTab;
  isActive: boolean;
  reason?: string;    // Base64 (비활성화 사유)
  placeName?: string; // Base64
  placeUrl?: string;  // 네이버 플레이스 URL
  mobileUrl?: string; // 모바일 플레이스 URL
  orderId?: string;
}

export interface ParkingItem {
  id: number;
  parkingAnswer: string;  // Base64
  chosungRange: 'consonant' | 'vowel';
  isActive: boolean;
  reason?: string;        // Base64 (비활성화 사유)
  placeName?: string;     // Base64
  placeUrl?: string;      // 네이버 플레이스 URL
  mobileUrl?: string;     // 모바일 플레이스 URL
  orderId?: string;
}

export interface QuizzesResponse {
  ret: number;
  data: QuizItem[];
  total: number;
}

export interface ParkingResponse {
  ret: number;
  data: ParkingItem[];
  total: number;
}

export const QUIZ_TAB_LABELS: Record<QuizTab, string> = {
  home: '홈',
  news: '소식',
  menu: '메뉴',
  review: '리뷰',
  map: '지도',
  around: '주변',
  info: '정보',
};

export const CHOSUNG_RANGE_LABELS: Record<string, string> = {
  consonant: '자음',
  vowel: '모음',
};
