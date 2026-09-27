// 공지사항 관련 타입 정의

export interface Notice {
  id: number;
  title: string;       // Base64 인코딩
  content: string;     // Base64 인코딩
  createdAt: string;
  isImportant?: boolean;
  isActive?: boolean;       // 활성화 여부 (false면 비활성화)
  createdBy?: string;       // 등록자 (Base64)
  updatedAt?: string;       // 수정 일시 (ISO 8601)
  updatedBy?: string;       // 수정자 (Base64)
}

export interface NoticesResponse {
  ret: number;
  data: Notice[];
  total: number;       // 전체 페이지 수
}
