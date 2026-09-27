# 대시보드 API (관리자용)

관리자 대시보드에 필요한 통계 데이터를 조회하는 API입니다.
기간 필터 하나로 전 영역이 동시에 집계됩니다.

## 인증

- `Authorization: Bearer {token}` 헤더 필요
- 토큰 만료 시 401 응답

---

## 대시보드 통계 조회

### 엔드포인트

```
GET /api/admin-app/dashboard
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| period | string | 선택 | 기간 필터 (`today`, `yesterday`, `week`, `month`, `all`, `custom`) | `today` |
| startDate | string | 선택 | 커스텀 시작일 (`custom`일 때 필수, YYYY-MM-DD) | - |
| endDate | string | 선택 | 커스텀 종료일 (`custom`일 때 필수, YYYY-MM-DD) | - |

#### period 파라미터 상세

| 값 | 설명 | 범위 |
|----|------|------|
| `today` | 오늘 데이터만 조회 | 오늘 00:00 ~ 23:59 |
| `yesterday` | 어제 데이터만 조회 | 어제 00:00 ~ 23:59 |
| `week` | 이번 주 데이터 조회 | 월요일 00:00 ~ 일요일 23:59 |
| `month` | 이번 달 데이터 조회 | 1일 00:00 ~ 말일 23:59 |
| `all` | 전체 기간 데이터 조회 | 서비스 시작일 ~ 현재 |
| `custom` | 직접 기간 설정 | startDate 00:00 ~ endDate 23:59 |

---

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | DashboardData | 대시보드 데이터 |

#### DashboardData

| 필드 | 타입 | 설명 |
|------|------|------|
| hero | HeroStats | 물량 진척 통계 |
| userStats | UserStats | 유저 진척 통계 |
| orderAgg | OrderAgg | 발주 집계 요약 |
| orderers | OrdererRow[] | 발주처별 집계 목록 |
| media | MediaRow[] | 앱사(매체사)별 소화량 목록 |
| status | StatusStats | 상태별 수행 현황 |
| types | TypeRow[] | 타입별 수행 현황 |
| topRankers | TopRanker[] | 상위 랭커 (완료 수 기준 TOP 10) |

---

### ① 유저 진척 (UserStats)

| 필드 | 타입 | 설명 |
|------|------|------|
| newUsers | number | 신규 가입자 수 |
| dailyActiveUsers | number | 일일 활성 유저 수 (DAU) |
| avgExecutions | number | 유저 1인당 평균 수행 건수 |

---

### ② 물량 진척 (HeroStats)

| 필드 | 타입 | 설명 |
|------|------|------|
| orders | number | 활성 발주 건수 |
| target | number | 목표 물량 (Σ 일일 목표) |
| completed | number | 소화 물량 (완료 수행 수) |
| timeout | number | 타임오버 수 |

---

### ③ 발주 집계 (OrderAgg + OrdererRow)

#### OrderAgg (요약)

| 필드 | 타입 | 설명 |
|------|------|------|
| orders | number | 총 발주 건수 |
| target | number | 총 목표 물량 |
| revenue | number | 총 매출 (원) |

#### OrdererRow (발주처별)

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 발주처명 |
| orders | number | 발주 건수 |
| target | number | 목표 물량 |
| revenue | number | 매출 (원) |

---

### ④ 앱사별 소화량 (MediaRow)

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 앱사(매체사)명 |
| completed | number | 소화량 (완료 수행 수) |
| share | number | 점유율 (%) |
| timeoutRate | number | 타임오버율 (%) |

> 총 소화량, 공급 부족 여부는 프론트에서 `media` 배열 기반으로 계산

---

### ⑤ 타입별 수행 현황 (TypeRow)

| 필드 | 타입 | 설명 |
|------|------|------|
| key | string | 타입 코드 (`save`, `quiz1`, `quiz2`, `direction`) |
| completed | number | 수행 완료 수 |
| target | number | 목표 수 |
| avgDuration | number | 평균 소요시간 (초) |

---

### ⑥ 상태별 수행 현황 (StatusStats)

| 필드 | 타입 | 설명 |
|------|------|------|
| completed | number | 완료 수 |
| progress | number | 진행중 수 |
| timeout | number | 타임오버 수 |
| skipped | number | 포기 수 |
| failed | number | 실패 수 |
| total | number | 전체 수행 수 |

---

### ⑦ 상위 랭커 (TopRanker)

완료 수행 수 기준 상위 10명

| 필드 | 타입 | 설명 |
|------|------|------|
| rank | number | 순위 (1~10) |
| uname | string | 유저 닉네임 |
| completed | number | 완료 수행 수 |

---

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": {
    "hero": {
      "orders": 24,
      "target": 500,
      "completed": 320,
      "timeout": 12
    },
    "userStats": {
      "newUsers": 45,
      "dailyActiveUsers": 320,
      "avgExecutions": 3.2
    },
    "orderAgg": {
      "orders": 24,
      "target": 500,
      "revenue": 16800000
    },
    "orderers": [
      { "name": "플리커", "orders": 8, "target": 175, "revenue": 6300000 },
      { "name": "애드플로우", "orders": 6, "target": 140, "revenue": 4200000 }
    ],
    "media": [
      { "name": "리워드킹", "completed": 120, "share": 37.5, "timeoutRate": 2.1 },
      { "name": "포인트팡", "completed": 98, "share": 30.6, "timeoutRate": 3.0 }
    ],
    "status": {
      "completed": 320,
      "progress": 5,
      "timeout": 12,
      "skipped": 18,
      "failed": 11,
      "total": 366
    },
    "types": [
      { "key": "save", "completed": 130, "target": 200, "avgDuration": 38 },
      { "key": "quiz1", "completed": 90, "target": 130, "avgDuration": 93 },
      { "key": "quiz2", "completed": 70, "target": 110, "avgDuration": 152 },
      { "key": "direction", "completed": 30, "target": 60, "avgDuration": 71 }
    ],
    "topRankers": [
      { "rank": 1, "uname": "미션왕김철수", "completed": 28 },
      { "rank": 2, "uname": "포인트헌터", "completed": 24 },
      { "rank": 3, "uname": "열심히하자", "completed": 21 }
    ]
  }
}
```

---

### 사용 예시

```
GET /api/admin-app/dashboard
GET /api/admin-app/dashboard?period=today
GET /api/admin-app/dashboard?period=yesterday
GET /api/admin-app/dashboard?period=week
GET /api/admin-app/dashboard?period=month
GET /api/admin-app/dashboard?period=all
GET /api/admin-app/dashboard?period=custom&startDate=2024-03-01&endDate=2024-03-31
```

---

## 에러 응답

```json
{
  "ret": -1,
  "message": "에러 메시지"
}
```

---

## 화면 구성 참고

### 레이아웃 (위에서 아래 순서)

1. **유저 진척**: 신규 가입자 / 일일 유입자(DAU) / 평균 수행치 (3열 카드)
2. **물량 진척**: 발주 건수 / 목표 물량 / 소화 물량 / 진척률 (4열 카드) + 잔여/타임오버/페이스 안내
3. **발주 집계 + 앱사별 소화량** (2열)
   - 발주 집계: 총 발주/물량/매출 요약 + 발주처 검색/정렬/페이지네이션(4건) + TOP3 랭킹
   - 앱사별 소화량: 총 소화량/점유율/평균 타임오버율 요약 + 검색/정렬/페이지네이션(4건) + TOP3 랭킹 + 공급 부족 뱃지
4. **타입별 + 상태별 + 상위 랭커** (3열)
   - 타입별 수행 현황: 진행 바 + 평균 소요시간
   - 상태별 수행 현황: 완료/진행중/타임오버/포기/실패 바 차트 + 타임오버율 경고
   - 상위 랭커: TOP 10 (금/은/동 메달)

### 기간 필터

- 오늘 / 어제 / 이번주 / 이번달 / 전체 / 기간 설정
- 기간 설정 선택 시 시작일/종료일 입력 + 조회 버튼
- 필터 변경 시 전 영역 동시 갱신
