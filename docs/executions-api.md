# 수행목록 API

## 인증

- `Authorization: Bearer {token}` 헤더 필요
- 토큰 만료 시 401 응답

---

## 수행목록 조회

### 엔드포인트

```
GET /api/admin-app/executions
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| status | string | 선택 | 수행 상태 필터 (`progress`, `completed`, `skipped`, `failed`, `timeout`) | `all` |
| type | string | 선택 | 수행 타입 필터 (`save`, `quiz1`, `quiz2`, `direction`) | `all` |
| period | string | 선택 | 기간 필터 (`today`, `yesterday`, `week`, `month`, `custom`) | 전체 |
| startDate | string | 선택 | 시작일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| endDate | string | 선택 | 종료일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| searchType | string | 선택 | 검색 유형 (`placeName`: 플레이스명, `uname`: 닉네임, `mname`: 매체사) | - |
| searchWords | string | 선택 | 검색어 | - |
| page | number | 선택 | 페이지 번호 | `1` |
| limit | number | 선택 | 페이지당 항목 수 | `20` |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| executions | Execution[] | 수행 목록 (아래 Execution 필드 참고) |
| total | number | 전체 수행 수 |

#### Execution 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 수행 고유 ID (UUID) |
| orderId | string | 발주 ID |
| uname | string | 유저 닉네임 |
| mname | string | 매체사명 (Base64 인코딩) |
| midx | number | 매체사 번호 |
| adid | string | 기기 고유값 |
| placeName | string | 플레이스 이름 (Base64 인코딩) |
| keyword | string | 수행 키워드 (Base64 인코딩) |
| type | string | 수행 타입 (`save`, `quiz1`, `quiz2`, `direction`) |
| subType | string | 세부 타입 (`car`, `bus`, `direction` 타입일 때만) |
| status | string | 수행 상태 (`progress`, `completed`, `skipped`, `failed`, `timeout`) |
| startedAt | string | 수행 시작 시간 (ISO 8601) |
| completedAt | string | 수행 완료 시간 (ISO 8601, 완료시에만) |
| createdAt | string | 생성일 (ISO 8601) |

#### Quiz 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| question | string | 질문 (Base64 인코딩) |
| answer | string | 정답 (Base64 인코딩) |
| tab | string | 탭 위치 (`home`, `news`, `menu`, `review`, `map`, `around`, `info`) |

#### CarMission 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| parkingAnswer | string | 주차 정답 (Base64 인코딩) |
| chosungRange | string | 힌트 종류 (`consonant`: 자음, `vowel`: 모음) |

### 성공 응답

```json
{
  "ret": 0,
  "executions": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "orderId": "550e8400-e29b-41d4-a716-446655440000",
      "uname": "행복한코끼리",
      "adid": "abc12345-def6-7890-ghij-klmnopqrstuv",
      "placeName": "64Ko7Y+s64+I6rCI67mEIOuqheyngOq1reygnOyLoOuPhOyLnOygkA==",
      "keyword": "66qF7KeAIOunm+ynkQ==",
      "type": "quiz1",
      "status": "completed",
      "startedAt": "2024-03-20T10:30:00.000Z",
      "completedAt": "2024-03-20T10:35:42.000Z",
      "createdAt": "2024-03-20T10:30:00.000Z"
    }
  ],
  "total": 1250
}
```

### 사용 예시

```
GET /api/admin-app/executions?page=1&limit=20
GET /api/admin-app/executions?status=progress&page=1&limit=20
GET /api/admin-app/executions?type=save&page=1&limit=20
GET /api/admin-app/executions?status=completed&type=quiz1&page=1&limit=20
GET /api/admin-app/executions?searchType=placeName&searchWords=카페&page=1&limit=20
GET /api/admin-app/executions?searchType=uname&searchWords=트럼프
```

---

## 수행 상세 조회

### 엔드포인트

```
GET /api/admin-app/executions/{id}
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | 필수 | 수행 고유 ID (UUID) |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| execution | ExecutionDetail | 수행 상세 정보 (아래 필드 참고) |

#### ExecutionDetail 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 수행 고유 ID (UUID) |
| orderId | string | 발주 ID |
| uname | string | 유저 닉네임 |
| mname | string | 매체사명 (Base64 인코딩) |
| midx | number | 매체사 번호 |
| adid | string | 기기 고유값 |
| placeName | string | 플레이스 이름 (Base64 인코딩) |
| placeId | string | 플레이스 ID |
| keyword | string | 수행 키워드 (Base64 인코딩) |
| type | string | 수행 타입 (`save`, `quiz1`, `quiz2`, `direction`) |
| subType | string | 세부 타입 (`car`, `bus`, `direction` 타입일 때만) |
| status | string | 수행 상태 (`progress`, `completed`, `skipped`, `failed`, `timeout`) |
| submittedValue | string | 사용자가 제출한 URL (`save`, `direction/bus` 타입만) |
| quizzes | Quiz[] | 퀴즈 목록 (quiz1: 1개, quiz2: 2개) |
| carMission | CarMission | 자동차 미션 정보 (direction 타입일 때만) |
| startedAt | string | 수행 시작 시간 (ISO 8601) |
| completedAt | string | 수행 완료 시간 (ISO 8601, 완료시에만) |
| createdAt | string | 생성일 (ISO 8601) |
| failReason | string | 실패 사유 (Base64 인코딩, 실패시에만) |

### 성공 응답

```json
{
  "ret": 0,
  "execution": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "uname": "행복한코끼리",
    "adid": "abc12345-def6-7890-ghij-klmnopqrstuv",
    "placeName": "64Ko7Y+s64+I6rCI67mEIOuqheyngOq1reygnOyLoOuPhOyLnOygkA==",
    "placeId": "1664320034",
    "keyword": "66qF7KeAIOunm+ynkQ==",
    "type": "quiz1",
    "status": "completed",
    "quizzes": [
      {
        "question": "7J207Zqo7JqU6rCoIOuyiOydtCDrp57snLzsi6DqsIDsmpQ/?",
        "answer": "7IKs7J6l64uYIOuniOydjOyXkCDrk5zripQg7ISc67mE7IqkIOyWtOuWpOqxsCDsnojrgpjsmpQ/?",
        "tab": "review"
      }
    ],
    "startedAt": "2024-03-20T10:30:00.000Z",
    "completedAt": "2024-03-20T10:35:42.000Z",
    "createdAt": "2024-03-20T10:30:00.000Z"
  }
}
```

### 사용 예시

```
GET /api/admin-app/executions/a1b2c3d4-e5f6-7890-abcd-ef1234567890
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

### 수행 상태 (status)

| 값 | 설명 |
|----|------|
| progress | 진행중 |
| completed | 완료 |
| skipped | 포기 |
| failed | 실패 |
| timeout | 타임오버 |

### 수행 타입 (type)

| 값 | 설명 |
|----|------|
| save | 플레이스 저장 |
| quiz1 | 유입미션(퀴즈1) |
| quiz2 | 유입미션(퀴즈2) |
| direction | 길찾기 미션 |
