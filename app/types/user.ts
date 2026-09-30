// 회원 관련 타입 정의

export interface User {
  id: string;           // 회원 고유번호 (UUID)
  uid: string;          // 회원 id (UUID, id와 같다)
  kind: 'app' | 'pcbang';      // 수행자 구분 (앱 사용자 / PC방 PC)
  affiliation: string;  // 소속: PC방 이름 또는 '앱' (Base64 인코딩)
  memo: string;         // 관리자 메모 (Base64 인코딩)
  uname: string;        // 유저 닉네임 (Base64 인코딩)
  isBlocked: boolean;    // 차단 여부 (true: 차단, false: 정상)
}

export type UserStatus = 'all' | 'normal' | 'blocked';

export interface UsersResponse {
  ret: number;
  data: User[];
  total: number;  // 전체 페이지 수
}

export interface UserNotification {
  id: number;
  title: string;       // Base64 인코딩
  message: string;     // Base64 인코딩
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  sentBy?: string;     // 송신자 (Base64 인코딩)
}

// 상태 라벨
export const USER_BLOCKED_LABELS: Record<string, string> = {
  'false': '정상',
  'true': '차단',
};

export const USER_BLOCKED_COLORS: Record<string, string> = {
  'false': 'bg-green-100 text-green-800',
  'true': 'bg-red-100 text-red-800',
};

/** 수행자 구분 라벨 */
export const APP_USER_KIND_LABELS: Record<User['kind'], string> = {
  app: '앱',
  pcbang: 'PC방 PC',
};
