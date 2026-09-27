# 발주 API

## 인증

- `Authorization: Bearer {token}` 헤더 필요
- 토큰 만료 시 401 응답

---

## 발주 목록 조회

### 엔드포인트

```
GET /api/admin-app/orders
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| status | string | 선택 | 발주 상태 필터 (`pending`, `progress`, `completed`, `cancelled`) | `all` |
| type | string | 선택 | 발주 타입 필터 (`save`, `quiz1`, `quiz2`, `direction`) | `all` |
| period | string | 선택 | 기간 필터 (`today`, `yesterday`, `week`, `month`, `custom`) | 전체 |
| startDate | string | 선택 | 시작일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| endDate | string | 선택 | 종료일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| searchType | string | 선택 | 검색 유형 (`placeName`: 플레이스명, `orderer`: 발주사, `placeId`: 플레이스 ID) | - |
| searchWords | string | 선택 | 검색어 | - |
| page | number | 선택 | 페이지 번호 | `1` |
| limit | number | 선택 | 페이지당 항목 수 | `20` |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| orders | Order[] | 발주 목록 (아래 Order 필드 참고) |
| total | number | 전체 발주 수 |

#### Order 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 발주 고유 ID (UUID) |
| type | string | 발주 타입 (`save`: 플레이스 저장, `quiz1`: 유입미션(퀴즈1), `quiz2`: 유입미션(퀴즈2), `direction`: 길찾기 미션) |
| placeName | string | 플레이스 이름 (Base64 인코딩) |
| placeId | string | 플레이스 ID |
| thumbnail | string | 썸네일 이미지 (Base64 인코딩 이미지 데이터) |
| category | string | 카테고리 (Base64 인코딩) |
| orderer | string | 발주사 (Base64 인코딩) |
| startDate | string | 시작일 (ISO 8601) |
| endDate | string | 종료일 (ISO 8601) |
| totalDailyCount | number | 일일 총 수행 수 |
| totalCount | number | 전체 수행 수 |
| completedCount | number | 완료된 수행 수 |
| totalPrice | number | 총 금액 (원) |
| status | string | 발주 상태 (`pending`, `progress`, `completed`, `cancelled`) |
| createdAt | string | 발주 생성일 (ISO 8601) |
| missionRatio | MissionRatio | 길찾기 미션 비율 (선택, `direction` 타입일 때만) |
| deferredChanges | DeferredChanges | 수정 예정 내용 (선택, 수정 요청 시 다음날부터 반영) |

### 성공 응답

```json
{
  "ret": 0,
  "orders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "quiz1",
      "placeName": "64Ko7Y+s64+I6rCI67mEIOuqheyngOq1reygnOyLoOuPhOyLnOygkA==",
      "placeId": "12345678",
      "thumbnail": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
      "category": "7J2M7Iud",
      "orderer": "7ZSM66as7Luk",
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-01-21T23:59:59.999Z",
      "totalDailyCount": 10,
      "totalCount": 70,
      "completedCount": 35,
      "totalPrice": 350000,
      "status": "progress",
      "createdAt": "2024-01-14T10:30:00.000Z"
    }
  ],
  "total": 150
}
```

### 사용 예시

```
GET /api/admin-app/orders?status=progress&page=1&limit=20
GET /api/admin-app/orders?type=quiz1&page=1&limit=20
GET /api/admin-app/orders?status=completed&type=save&page=1&limit=20
GET /api/admin-app/orders?searchType=placeName&searchWords=카페&page=1&limit=20
GET /api/admin-app/orders?searchType=orderer&searchWords=플리커
```

---

## 발주 상세 조회

### 엔드포인트

```
GET /api/admin-app/orders/{id}
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | 필수 | 발주 고유 ID (UUID) |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| order | Order | 발주 상세 정보 (아래 Order 필드 참고) |

#### Order 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 발주 고유 ID (UUID) |
| type | string | 발주 타입 (`save`, `quiz1`, `quiz2`, `direction`) |
| placeName | string | 플레이스 이름 (Base64 인코딩) |
| placeId | string | 플레이스 ID |
| placeUrl | string | 네이버 플레이스 URL |
| mobileUrl | string | 모바일 플레이스 URL |
| thumbnail | string | 썸네일 이미지 (Base64 인코딩 이미지 데이터) |
| category | string | 카테고리 (Base64 인코딩) |
| orderer | string | 발주사 (Base64 인코딩) |
| keywords | KeywordOrder[] | 키워드 목록 |
| startDate | string | 시작일 |
| endDate | string | 종료일 |
| totalDailyCount | number | 일일 총 수행 수 |
| totalCount | number | 전체 수행 수 |
| completedCount | number | 완료된 수행 수 |
| totalPrice | number | 총 금액 (원) |
| status | string | 발주 상태 |
| createdAt | string | 발주 생성일 (ISO 8601) |
| quizzes | Quiz[] | 퀴즈 목록 (옵션) |
| carMissions | CarMission[] | 자동차 미션 목록 (옵션) |
| missionRatio | MissionRatio | 미션 비율 (옵션) |
| deferredChanges | DeferredChanges | 수정 예정 내용 (선택, 수정 요청 시 다음날부터 반영) |
| deferredQuizzes | Quiz[] | 변경 예정 퀴즈 목록 (Base64 인코딩, 선택, 다음날부터 반영) |
| cancelledBy | string | 취소 처리자 (Base64, 취소된 발주만) |
| cancelledAt | string | 취소 일시 (ISO 8601, 취소된 발주만) |

### 성공 응답

```json
{
  "ret": 0,
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "quiz1",
    "placeName": "64Ko7Y+s64+I6rCI67mEIOuqheyngOq1reygnOyLoOuPhOyLnOygkA==",
    "placeId": "1664320034",
    "thumbnail": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "category": "6rOg6riw7JqU66as",
    "orderer": "7ZSM66as7Luk",
    "keywords": [
      {
        "id": 1,
        "keyword": "66qF7KeAIOunm+ynkQ==",
        "dailyCount": 10,
        "totalCount": 70,
        "completedCount": 35
      }
    ],
    "startDate": "2024-03-20",
    "endDate": "2024-03-27",
    "totalDailyCount": 10,
    "totalCount": 70,
    "completedCount": 35,
    "totalPrice": 42000,
    "status": "progress",
    "createdAt": "2024-03-19T10:00:00Z",
    "quizzes": [
      {
        "id": 1,
        "question": "7J20IOunpOyepeydmCDsmIHsl4Xsi5zqsITsnYA/",
        "answer": "MTA6MDAgLSAyMjowMA==",
        "tab": "home"
      }
    ],
    "carMissions": [
      {
        "id": 1,
        "parkingAnswer": "7KeA7ZWY7KO87LCo",
        "chosungRange": "consonant"
      }
    ],
    "missionRatio": {
      "car": 70,
      "bus": 30
    }
  }
}
```

### 필드 설명

#### KeywordOrder 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 키워드 고유 ID |
| keyword | string | 키워드 (Base64 인코딩) |
| rank | number | 현재 순위 |
| dailyCount | number | 일일 수행 수 |
| totalCount | number | 전체 수행 수 |
| completedCount | number | 완료된 수행 수 |

#### Quiz 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 퀴즈 고유 ID |
| question | string | 질문 (Base64 인코딩) |
| answer | string | 정답 (Base64 인코딩) |
| tab | string | 탭 위치 (`home`, `news`, `menu`, `review`, `map`, `around`, `info`) |
| isActive | boolean | 활성화 여부 (비활성화된 퀴즈는 `false`) |
| reason | string | 비활성화 사유 (Base64 인코딩, 비활성화된 경우만) |

#### CarMission 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 자동차 미션 고유 ID |
| parkingAnswer | string | 주차 정답 (Base64 인코딩) |
| chosungRange | string | 힌트 종류 (`consonant`: 자음, `vowel`: 모음) |
| isActive | boolean | 활성화 여부 (비활성화된 주차장 문제는 `false`) |
| reason | string | 비활성화 사유 (Base64 인코딩, 비활성화된 경우만) |

#### MissionRatio 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| car | number | 자동차 미션 비율 (%) |
| bus | number | 버스 미션 비율 (%) |

#### DeferredChanges 객체

수정 요청 시 다음날부터 반영되는 예정 내용입니다. 해당 필드가 없으면 수정 예정 없음.

| 필드 | 타입 | 설명 |
|------|------|------|
| endDate | string | 수정 예정 종료일 (YYYY-MM-DD) |
| totalDailyCount | number | 수정 예정 총 수량 |

### 사용 예시

```
GET /api/admin-app/orders/550e8400-e29b-41d4-a716-446655440000
```

---

## 썸네일 변경

발주의 썸네일 이미지를 변경합니다.

### 엔드포인트

```
POST /api/admin-app/orders/{id}/thumbnail
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | 필수 | 발주 고유 ID (UUID) |

### 요청 Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| thumbnail | string | 필수 | 썸네일 이미지 (Base64 데이터, `data:image/...;base64,...`) |

```json
{
  "thumbnail": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "썸네일이 변경되었습니다."
}
```

---

## 퀴즈 교체

특정 발주의 퀴즈를 전체 교체합니다. 기존 퀴즈는 모두 삭제되고 새 퀴즈로 대체됩니다.

### 엔드포인트

```
POST /api/admin-app/orders/{id}/quizzes/replace
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | 필수 | 발주 고유 ID (UUID) |

### 요청 Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| quizzes | Quiz[] | 필수 | 새 퀴즈 목록 |

#### Quiz 객체

| 필드 | 타입 | 인코딩 | 필수 | 설명 |
|------|------|--------|------|------|
| tab | string | - | 필수 | 탭 위치 (`home`, `news`, `menu`, `review`, `map`, `around`, `info`) |
| question | string | Base64 | 필수 | 질문 |
| answer | string | Base64 | 필수 | 정답 |

```json
{
  "quizzes": [
    { "tab": "home", "question": "7J207IS47J2AIOyWtOq4sCDsiJjti4ntlZjrgpjsmpQ/", "answer": "MDk6MDAgfiAyMjowMA==" },
    { "tab": "review", "question": "64yA7ZGcIOuplOuJtOuKlD8=", "answer": "7ZWc7Jqw66y8" }
  ]
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "퀴즈가 교체되었습니다."
}
```

### 엑셀 업로드 형식

프론트에서 엑셀 파일을 파싱하여 API를 호출합니다. 엑셀 형식:

| tab | 질문 | 정답 |
|-----|------|------|
| home | 영업시간은? | 09:00 ~ 22:00 |
| review | 대표 메뉴는? | 한우물 |

---

## 발주 취소

대기중(`pending`) 또는 진행중(`progress`) 상태의 발주를 취소합니다.

### 엔드포인트

```
POST /api/admin-app/orders/{id}/cancel
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | 필수 | 발주 고유 ID (UUID) |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| message | string | 결과 메시지 |

### 성공 응답

```json
{
  "ret": 0,
  "message": "발주가 취소되었습니다."
}
```

### 에러 케이스

- 이미 완료된 발주: `ret: -1, message: "이미 완료된 발주는 취소할 수 없습니다."`
- 이미 취소된 발주: `ret: -1, message: "이미 취소된 발주입니다."`

### 사용 예시

```
POST /api/admin-app/orders/550e8400-e29b-41d4-a716-446655440000/cancel
```

---

## 에러 응답

```json
{
  "ret": -1,
  "message": "에러 메시지"
}
```

## 상태값

### 발주 상태 (status)

| 값 | 설명 |
|----|------|
| pending | 대기중 |
| progress | 진행중 |
| completed | 완료 |
| cancelled | 취소됨 |

### 발주 타입 (type)

| 값 | 설명 |
|----|------|
| save | 플레이스 저장 |
| quiz1 | 유입미션(퀴즈1) |
| quiz2 | 유입미션(퀴즈2) |
| direction | 길찾기 미션 |
