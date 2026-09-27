# 퀴즈/주차장 관리 API (관리자용)

전체 퀴즈 및 주차장 문제 목록을 조회하고 활성화/비활성화를 관리하는 API입니다.

## 인증

- `Authorization: Bearer {token}` 헤더 필요
- 토큰 만료 시 401 응답

---

## API 목록

| API | 메서드 | 엔드포인트 | 설명 |
|-----|--------|-----------|------|
| 퀴즈 목록 조회 | GET | `/api/admin-app/quizzes` | 탭/활성 필터, 페이지네이션 지원 |
| 주차장 문제 목록 조회 | GET | `/api/admin-app/parkings` | 활성 필터, 페이지네이션 지원 |
| 퀴즈/주차장 활성화/비활성화 | POST | `/api/admin-app/missions/toggle-active` | 기존 API 사용 |

---

## 1. 퀴즈 목록 조회

### 엔드포인트

```
GET /api/admin-app/quizzes
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| tab | string | 선택 | 탭 필터 (`home`, `news`, `menu`, `review`, `map`, `around`, `info`) | 전체 |
| isActive | string | 선택 | 활성 상태 필터 (`true`: 활성, `false`: 비활성) | 전체 |
| period | string | 선택 | 기간 필터 (`today`, `yesterday`, `week`, `month`, `custom`) — 비활성화된 날짜 기준 | 전체 |
| startDate | string | 선택 | 시작일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| endDate | string | 선택 | 종료일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| searchType | string | 선택 | 검색 유형 (`question`: 질문, `answer`: 정답, `placeName`: 플레이스명) | - |
| searchWords | string | 선택 | 검색어 (Base64 인코딩하여 전송) | - |
| page | number | 선택 | 페이지 번호 | 1 |
| limit | number | 선택 | 페이지당 항목 수 | 20 |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | QuizItem[] | 퀴즈 목록 |
| total | number | 전체 퀴즈 수 |

#### QuizItem 필드

| 필드 | 타입 | 인코딩 | 설명 |
|------|------|--------|------|
| id | number | - | 퀴즈 ID |
| question | string | Base64 | 질문 |
| answer | string | Base64 | 정답 |
| tab | string | - | 탭 위치 (`home`, `news`, `menu`, `review`, `map`, `around`, `info`) |
| isActive | boolean | - | 활성화 여부 |
| reason | string | Base64 | 비활성화 사유 (비활성화된 경우만) |
| placeName | string | Base64 | 플레이스명 |
| placeUrl | string | - | 네이버 플레이스 URL |
| mobileUrl | string | - | 모바일 플레이스 URL |
| orderId | string | - | 발주 ID |

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": [
    {
      "id": 1001,
      "question": "7J20IO2UjOugiOydtOyKpOydmCDsmIHsl4Xsi5zqsITsnYA/",
      "answer": "MDk6MDAgfiAyMjowMA==",
      "tab": "home",
      "isActive": true,
      "placeName": "66ee65Gs64KQ65Oc7ZmN64yA7KCA",
      "placeUrl": "https://map.naver.com/p/entry/place/1234567890",
      "mobileUrl": "https://m.place.naver.com/place/1234567890",
      "orderId": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "id": 1002,
      "question": "7J20IOuniOyepeydmCDsnbjquLAg66mU64m0IOydhCDslYzroKTso7zshLjsmpQ=",
      "answer": "7ZWc7Jqw66y8",
      "tab": "review",
      "isActive": false,
      "reason": "7KCV64u57J20IO2LgOumvA==",
      "placeName": "7Lm07Lm0IOy5tO2OmA==",
      "orderId": "660e8400-e29b-41d4-a716-446655440001"
    }
  ],
  "total": 150
}
```

### 사용 예시

```
GET /api/admin-app/quizzes
GET /api/admin-app/quizzes?tab=home&page=1&limit=20
GET /api/admin-app/quizzes?isActive=false
GET /api/admin-app/quizzes?tab=review&isActive=true&page=2
GET /api/admin-app/quizzes?searchType=placeName&searchWords=7Lm07Lm0
```

---

## 2. 주차장 문제 목록 조회

### 엔드포인트

```
GET /api/admin-app/parkings
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| isActive | string | 선택 | 활성 상태 필터 (`true`: 활성, `false`: 비활성) | 전체 |
| period | string | 선택 | 기간 필터 (`today`, `yesterday`, `week`, `month`, `custom`) — 비활성화된 날짜 기준 | 전체 |
| startDate | string | 선택 | 시작일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| endDate | string | 선택 | 종료일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| searchType | string | 선택 | 검색 유형 (`parkingAnswer`: 주차 정답, `placeName`: 플레이스명) | - |
| searchWords | string | 선택 | 검색어 (Base64 인코딩하여 전송) | - |
| page | number | 선택 | 페이지 번호 | 1 |
| limit | number | 선택 | 페이지당 항목 수 | 20 |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | ParkingItem[] | 주차장 문제 목록 |
| total | number | 전체 주차장 문제 수 |

#### ParkingItem 필드

| 필드 | 타입 | 인코딩 | 설명 |
|------|------|--------|------|
| id | number | - | 주차장 문제 ID |
| parkingAnswer | string | Base64 | 주차 정답 |
| chosungRange | string | - | 힌트 종류 (`consonant`: 자음, `vowel`: 모음) |
| isActive | boolean | - | 활성화 여부 |
| reason | string | Base64 | 비활성화 사유 (비활성화된 경우만) |
| placeName | string | Base64 | 플레이스명 |
| placeUrl | string | - | 네이버 플레이스 URL |
| mobileUrl | string | - | 모바일 플레이스 URL |
| orderId | string | - | 발주 ID |

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": [
    {
      "id": 2001,
      "parkingAnswer": "7KeA7ZWY7KO87LCo",
      "chosungRange": "consonant",
      "isActive": true,
      "placeName": "66ee65Gs64KQ65Oc7ZmN64yA7KCA",
      "placeUrl": "https://map.naver.com/p/entry/place/1234567890",
      "mobileUrl": "https://m.place.naver.com/place/1234567890",
      "orderId": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "total": 50
}
```

### 사용 예시

```
GET /api/admin-app/parkings
GET /api/admin-app/parkings?isActive=false
GET /api/admin-app/parkings?searchType=placeName&searchWords=7Lm07Lm0
```

---

## 3. 퀴즈/주차장 활성화/비활성화

기존 미션 문제 토글 API를 사용합니다.

### 엔드포인트

```
POST /api/admin-app/missions/toggle-active
```

### 요청 Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | string | 필수 | 문제 유형 (`quiz`: 퀴즈, `parking`: 주차장 문제) |
| id | number | 필수 | 퀴즈 ID |
| isActive | boolean | 필수 | `true`: 활성화, `false`: 비활성화 |
| reason | string | 선택 | 비활성화 사유 (Base64 인코딩, `isActive`가 `false`일 때만) |

---

## 에러 응답 (공통)

```json
{
  "ret": -1,
  "message": "에러 메시지"
}
```

---

## 화면 구성 참고

### 목록

- 헤더: 제목 + 전체 퀴즈 수
- 탭 필터: 전체 / 홈 / 뉴스 / 메뉴 / 리뷰 / 지도 / 주변 / 정보
- 상태 필터: 전체 / 활성 / 비활성
- 검색: 질문 / 정답 / 플레이스명
- 각 항목: 탭 뱃지 + 활성/비활성 뱃지 + 질문 + 정답 + 플레이스명 + 비활성화/활성화 버튼
- 비활성화된 퀴즈는 흐리게 + 비활성화 사유 표시
- 페이지당 20건

### Base64 인코딩

**조회 응답 (디코딩 필요):** `question`, `answer`, `placeName`, `reason`
