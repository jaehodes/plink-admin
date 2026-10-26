/** 플레이스 (plink-api /api/admin-app/places, docs/admin-app/places-api.md) */

export interface Place {
  id: string; // 네이버 place ID
  name: string;
  category: string;
  thumbnail: string; // R2, 없으면 네이버 CDN, 둘 다 없으면 ''
  url: string;
  mobileUrl: string;
  createdAt: string;
}
