# 문의 목록 API (관리자용)

관리자 페이지에서 사용자들이 제출한 미션 신고(문의) 내역을 조회하고 처리하는 API입니다.

## 인증

- `Authorization: Bearer {token}` 헤더 필요
- 토큰 만료 시 401 응답

---

## API 목록

| API | 메서드 | 엔드포인트 | 설명 |
|-----|--------|-----------|------|
| 문의 목록 조회 | GET | `/api/admin-app/mission-reports` | 간단한 목록 |
| 상세 문의 조회 | GET | `/api/admin-app/mission-reports/{id}` | 모달 오픈 시 호출 |
| 문의 처리 완료 | POST | `/api/admin-app/mission-reports/{id}/resolve` | 처리완료 처리 |
| 미션 문제 활성화/비활성화 | POST | `/api/admin-app/missions/toggle-active` | 퀴즈/주차장 문제 토글 |

---

## 1. 문의 목록 조회

### 엔드포인트

```
GET /api/admin-app/mission-reports
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| status | string | 선택 | 처리 상태 필터 (`pending`, `resolved`) | 전체 |
| period | string | 선택 | 기간 필터 (`today`, `yesterday`, `week`, `month`, `custom`) | 전체 |
| startDate | string | 선택 | 시작일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| endDate | string | 선택 | 종료일 (`YYYY-MM-DD`, `period=custom`일 때만 사용) | - |
| searchType | string | 선택 | 검색 유형 (`uname`: 닉네임, `mname`: 매체사, `orderer`: 발주사) | - |
| searchWords | string | 선택 | 검색어 | - |
| page | number | 선택 | 페이지 번호 | 1 |
| limit | number | 선택 | 페이지당 항목 수 | 5 |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | MissionReportSummary[] | 문의 목록 |
| total | number | 전체 페이지 수 |

#### MissionReportSummary 필드

| 필드 | 타입 | 인코딩 | 설명 |
|------|------|--------|------|
| id | number | - | 신고 ID |
| missionType | string | - | 미션 유형 (`save`, `quiz1`, `quiz2`, `direction`) |
| missionSubType | string | - | 미션 서브 유형 (`car`, `bus`, direction만) |
| reason | string | Base64 | 신고 사유 |
| status | string | - | 처리 상태 (`pending`, `resolved`) |
| createdAt | string | - | 접수 일시 (ISO 8601) |
| resolvedAt | string | - | 처리 완료 일시 (resolved만) |
| isReadByUser | boolean | - | 유저가 답변을 읽었는지 (resolved만) |
| uname | string | Base64 | 신고한 사용자 닉네임 |
| orderer | string | Base64 | 발주사 |
| mname | string | Base64 | 매체사명 |
| placeName | string | Base64 | 플레이스명 |
| midx | number | - | 매체사 번호 |

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": [
    {
      "id": 1,
      "missionType": "save",
      "reason": "7Jis67CU66W4IFVSTOydhCDsoJzstpztlojripTrjbAg7Iuk7Yyo7ZW07JqU",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z",
      "uname": "6rmA66+87KSA",
      "orderer": "7ZSM66as7Luk7L2U66as7JW0",
      "mname": "64Sk7J20",
      "midx": 1
    },
    {
      "id": 3,
      "missionType": "direction",
      "missionSubType": "car",
      "reason": "7KO87LCo7J6l7J2EIOywvuydhCDsiJgg7JeG7Ja07JqU",
      "status": "resolved",
      "createdAt": "2024-01-10T09:00:00Z",
      "resolvedAt": "2024-01-11T14:00:00Z",
      "isReadByUser": true,
      "uname": "67CV7KeA7Zi4",
      "orderer": "7Lm07Lm07Jeo7YSw",
      "mname": "7Lm07Lm0",
      "midx": 2
    }
  ],
  "total": 3
}
```

### 사용 예시

```
GET /api/admin-app/mission-reports
GET /api/admin-app/mission-reports?page=1&limit=5
GET /api/admin-app/mission-reports?status=pending
GET /api/admin-app/mission-reports?status=resolved&page=2
GET /api/admin-app/mission-reports?period=today
GET /api/admin-app/mission-reports?period=week&status=pending
GET /api/admin-app/mission-reports?period=custom&startDate=2025-06-01&endDate=2025-06-22
GET /api/admin-app/mission-reports?searchType=uname&searchWords=트럼프
GET /api/admin-app/mission-reports?searchType=mname&searchWords=네이버
GET /api/admin-app/mission-reports?searchType=orderer&searchWords=플리커
```

---

## 2. 상세 문의 조회

목록에서 클릭 시 호출합니다. 미션 상세 정보(퀴즈 배열, 주차장 문제 등)를 포함합니다.

### 엔드포인트

```
GET /api/admin-app/mission-reports/{id}
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | 필수 | 신고 ID |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | MissionReportDetail | 상세 문의 정보 |

#### MissionReportDetail 필드

| 필드 | 타입 | 인코딩 | 조건 | 설명 |
|------|------|--------|------|------|
| id | number | - | 공통 | 신고 ID |
| missionType | string | - | 공통 | 미션 유형 (`save`, `quiz1`, `quiz2`, `direction`) |
| missionSubType | string | - | direction만 | 미션 서브 유형 (`car`, `bus`) |
| missionId | number | - | 공통 | 미션 ID |
| submittedValue | string | Base64 | 공통 | 사용자가 제출한 값 (URL 또는 정답) |
| reason | string | Base64 | 공통 | 신고 사유 (100자 이내) |
| status | string | - | 공통 | 처리 상태 (`pending`, `resolved`) |
| createdAt | string | - | 공통 | 접수 일시 (ISO 8601) |
| resolvedAt | string | - | resolved만 | 처리 완료 일시 (ISO 8601) |
| adminNote | string | Base64 | resolved만 | 관리자 답변 (300자 이내) |
| resolvedBy | string | Base64 | resolved만 | 처리한 관리자 닉네임 |
| isReadByUser | boolean | - | resolved만 | 유저가 답변을 읽었는지 여부 |
| uname | string | Base64 | 공통 | 신고한 사용자 닉네임 |
| orderer | string | Base64 | 공통 | 발주사 |
| mname | string | Base64 | 공통 | 매체사명 |
| midx | number | - | 공통 | 매체사 번호 |
| placeName | string | Base64 | 공통 | 플레이스명 |
| placeUrl | string | - | 공통 | 네이버 플레이스 URL |
| quiz | Quiz | - | quiz1/quiz2만 | 해당 퀴즈 (유저측에서 문제신고된 퀴즈id와 일치한 퀴즈) |
| carParking | CarParking | - | direction/car만 | 주차장 문제 |

#### Quiz 객체

| 필드 | 타입 | 인코딩 | 설명 |
|------|------|--------|------|
| id | number | - | 퀴즈 ID |
| question | string | Base64 | 질문 |
| answer | string | Base64 | 정답 |
| isActive | boolean | - | 활성화 여부 (`false`: 비활성화된 퀴즈) |
| reason | string | Base64 | 비활성화 사유 (비활성화된 경우만) |

#### CarParking 객체

| 필드 | 타입 | 인코딩 | 설명 |
|------|------|--------|------|
| id | number | - | 주차장 문제 ID |
| parkingAnswer | string | Base64 | 주차장 정답 |
| chosungRange | string | - | 힌트 종류 (`consonant`: 자음, `vowel`: 모음) |
| isActive | boolean | - | 활성화 여부 (`false`: 비활성화된 주차장 문제) |
| reason | string | Base64 | 비활성화 사유 (비활성화된 경우만) |

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": {
    "id": 2,
    "missionType": "quiz1",
    "missionId": 202,
    "submittedValue": "7JuU7JqU7J28",
    "reason": "7KCV64u17J20IOyXrOufrCDqsJwg6rCA64ql7ZWcIOqygyDqsJnsirXri4jri6Qu",
    "status": "pending",
    "createdAt": "2024-01-14T15:20:00Z",
    "uname": "7J207ISc7Jew",
    "orderer": "7Lm07Lm07Jeo7YSw",
    "mname": "7Lm07Lm0",
      "midx": 2,
    "placeName": "66ee65Gs64KQ65Oc7ZmN64yA7KCA",
    "placeUrl": "https://map.naver.com/p/entry/place/202",
    "quiz": { "id": 1001, "question": "7J20IO2UjOugiOydtOyKpOydmCDsmIHsl4Xsi5zqsITsnYA/", "answer": "MDk6MDAgfiAyMjowMA==" }
  }
}
```

---

## 에러 응답 (공통)

모든 API에서 에러 시 동일한 형식으로 응답합니다.

```json
{
  "ret": -1,
  "message": "에러 메시지"
}
```

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 인증 실패 | `"인증이 필요합니다."` |
| -1 | 토큰 만료 | `"토큰이 만료되었습니다."` |
| -1 | 서버 오류 | `"서버 오류가 발생했습니다."` |

---

## 3. 문의 처리 완료

문의를 처리완료 상태로 변경합니다.

### 엔드포인트

```
POST /api/admin-app/mission-reports/{id}/resolve
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | 필수 | 신고 ID |

### 요청 Body

| 필드 | 타입 | 인코딩 | 필수 | 설명 |
|------|------|--------|------|------|
| adminNote | string | Base64 | 필수 | 관리자 답변 (300자 이내, Base64 인코딩하여 전송) |

```json
{
  "adminNote": "7ZmV7J24IOqysOqzvCDtlbTri7kg7KO87LCo7J6l7J20IO2PkOyXheuQmOyWtCDrr7jshZjsnbQg7IiY7KCV65CY7JeI7Iq164uI64ukLg=="
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "처리가 완료되었습니다."
}
```

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 존재하지 않는 신고 | `"신고를 찾을 수 없습니다."` |
| -1 | 잘못된 상태 전환 | `"접수됨 상태에서만 처리완료로 변경할 수 있습니다."` |
| -1 | 답변 누락 | `"관리자 답변을 입력해주세요."` |

---

## 4. 미션 문제 활성화/비활성화

퀴즈(`quiz1`/`quiz2` 미션) 또는 주차장 문제(`direction/car` 미션)를 활성화/비활성화합니다.
미션 자체는 유지되고, 비활성화된 문제만 더 이상 사용자에게 출제되지 않습니다.
처리 완료 API와 독립적으로 호출합니다.

### 엔드포인트

```
POST /api/admin-app/missions/toggle-active
```

### 요청 Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | string | 필수 | 문제 유형 (`quiz`: 퀴즈, `parking`: 주차장 문제) |
| id | number | 필수 | 퀴즈 ID 또는 주차장 문제 ID |
| isActive | boolean | 필수 | `true`: 활성화, `false`: 비활성화 |
| reason | string | 선택 | 비활성화 사유 (Base64 인코딩, `isActive`가 `false`일 때만) |

```json
{
  "type": "quiz",
  "id": 1001,
  "isActive": false,
  "reason": "7KCV64u57J20IO2LgOumvA=="
}
```

```json
{
  "type": "parking",
  "id": 2001,
  "isActive": true
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "퀴즈가 비활성화되었습니다."
}
```

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 존재하지 않는 문제 | `"문제를 찾을 수 없습니다."` |

---

## 화면 구성 참고

### 목록

- 기간 필터: 전체 / 오늘 / 어제 / 이번주 / 이번달 / 기간 설정 (기간 설정 시 날짜 범위 직접 입력)
- 상태 필터: 전체 / 접수됨 / 처리완료
- 각 항목: 미션유형 뱃지 + 상태 뱃지 + 유저 읽음/안읽음 뱃지(처리완료만) + 신고 사유 + 닉네임 + 발주사 + 매체사 + 접수일 + 처리일(처리완료만)
- 클릭 시 상세 모달 오픈
- 페이지당 10건, `total`은 전체 페이지 수

### 상세 모달

- **헤더**: 상태 뱃지, 미션유형 뱃지, `신고 #ID`, `미션 #미션ID`
- **미션 정보 섹션** (배경 분리):
  - 공통: 플레이스명 + 발주사 뱃지 + 플레이스 보기 링크
  - `quiz1`/`quiz2`: 질문/정답 카드 + **문제 비활성화하기 / 활성화하기** 토글 버튼
  - `direction/car`: 검색위치/초성힌트/주차정답 카드 + **문제 비활성화하기 / 활성화하기** 토글 버튼 (비활성화 시 카드 전체 흐려짐)
- **신고 정보**: 사유 + 제출한 값 (URL이면 새 탭 링크)
- **메타 정보** (3열 그리드): 신고자, 매체사, 접수일, 처리일, 처리자(`resolvedBy`), 유저 확인(`isReadByUser`)
- **접수됨 상태**:
  - 답변 입력 (필수, 300자, 글자 수 카운터, 줄바꿈 가능)
  - 처리하기 → 확인 모달 (답변 표시) → 확인 시 처리 완료 API 호출
- **처리완료 상태**: 관리자 답변 표시 (줄바꿈 유지) + 유저 확인 여부(읽음/안읽음)

---

## 참고: 개요

### 문의란?

사용자가 미션 수행 중 문제가 발생했을 때 신고를 제출하는 것입니다. 관리자는 이 신고를 확인하고, 답변을 작성하고, 오류가 있는 퀴즈/주차장 문제를 비활성화할 수 있습니다.

### 미션 유형별 특성

| 미션 유형 | 코드 | 서브타입 | 사용자가 제출하는 값 | 관리자가 확인할 미션 정보 |
|-----------|------|----------|---------------------|------------------------|
| 플레이스 저장 | `save` | - | 네이버 지도 URL | 플레이스명 |
| 유입미션(퀴즈1) | `quiz1` | - | 퀴즈 정답 (텍스트) | 플레이스명, 퀴즈 질문/정답 |
| 유입미션(퀴즈2) | `quiz2` | - | 퀴즈 정답 (텍스트) | 플레이스명, 퀴즈 질문/정답 |
| 길찾기 (자동차) | `direction` | `car` | 정답 (텍스트) | 플레이스명, 검색위치, 초성힌트, 주차장 정답 |
| 길찾기 (버스) | `direction` | `bus` | 네이버 지도 URL | 플레이스명 |

> `save`와 `direction/bus`의 제출값은 `https://`로 시작하는 URL입니다. 프론트에서 링크로 표시합니다.
> `quiz1`/`quiz2`와 `direction/car`의 제출값은 일반 텍스트입니다.

### 처리 흐름

```
접수됨(pending) ──[관리자 처리]──> 처리완료(resolved)
                      │
                      ├── 답변 작성 (필수, 300자 이내)
                      ├── 퀴즈 비활성화 (선택, quiz1/quiz2 미션만)
                      └── 주차장 문제 비활성화 (선택, direction/car 미션만)
```

1. 사용자가 미션 수행 중 문제를 신고하면 **접수됨(`pending`)** 상태로 등록됩니다.
2. 관리자가 목록에서 해당 문의를 클릭하면 상세 모달이 열립니다.
3. 관리자가 미션 정보를 확인하고, 오류가 있는 퀴즈/주차장 문제가 있으면 비활성화합니다.
4. 답변을 작성한 뒤 **처리하기** 버튼을 누르면 확인 모달이 뜹니다.
5. 확인하면 **처리완료(`resolved`)** 상태가 됩니다.

### 발주사 vs 매체사

- **발주사(`orderer`)**: 미션을 발주한 회사 (예: 플리커코리아, 카카오엔터, 우아한형제들)
- **매체사(`mname`)**: 미션이 실행되는 플랫폼 (예: 네이버, 카카오, 배민)
- **매체사 번호(`midx`)**: 매체사 고유 번호

### Base64 인코딩

다음 필드들은 Base64로 인코딩된 상태로 응답됩니다. 프론트에서 `DecodeBase64`로 디코딩 후 표시합니다.

**조회 응답 (디코딩 필요):** `submittedValue`, `reason`, `adminNote`, `uname`, `orderer`, `mname`, `placeName`, `resolvedBy`, Quiz의 `question`/`answer`, CarParking의 `parkingAnswer`

**처리 완료 요청 (인코딩 필요):** `adminNote`
