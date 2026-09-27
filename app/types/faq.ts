// FAQ 관련 타입 정의

export interface FaqItem {
  id: number;
  question: string;  // Base64 인코딩
  answer: string;    // Base64 인코딩
  category: string;
}

export interface FaqResponse {
  ret: number;
  data: FaqItem[];
  total: number;  // 전체 페이지 수
}

export interface FaqCategory {
  id: string;
  label: string;
}

export interface FaqCategoriesResponse {
  ret: number;
  data: FaqCategory[];
}
