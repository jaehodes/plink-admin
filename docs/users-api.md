# 회원관리 API (관리자용)

회원 목록을 조회하는 API입니다.

## 인증

- `Authorization: Bearer {token}` 헤더 필요
- 토큰 만료 시 401 응답

---

## API 목록

| API | 메서드 | 엔드포인트 | 설명 |
|-----|--------|-----------|------|
| 회원 목록 조회 | GET | `/api/admin-app/users` | 필터/검색/페이지네이션 |
| 회원 상태 조회 | GET | `/api/admin-app/users/status` | 차단 여부 확인 |
| 회원 차단/해제 | POST | `/api/admin-app/users/toggle-block` | 차단 상태 토글 |
| 회원 메모 저장 | POST | `/api/admin-app/users/memo` | 관리자 메모 저장 |
| 회원 알림 내역 조회 | GET | `/api/admin-app/users/{uid}/notifications` | 해당 회원 알림 내역 |
| 회원 알림 전송 | POST | `/api/admin-app/users/send-notification` | 특정 회원에게 알림 전송 |

---

## 회원 목록 조회

### 엔드포인트

```
GET /api/admin-app/users
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| status | string | 선택 | 회원 상태 필터 (`normal`: 정상, `blocked`: 정지) | 전체 |
| page | number | 선택 | 페이지 번호 | 1 |
| limit | number | 선택 | 페이지당 항목 수 | 10 |
| searchType | string | 선택 | 검색 유형 (`uid`: ID, `uname`: 닉네임) | - |
| searchWords | string | 선택 | 검색어 | - |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | User[] | 회원 목록 |
| total | number | 전체 회원 수 |

#### User 필드

| 필드 | 타입 | 인코딩 | 설명 |
|------|------|--------|------|
| id | number | - | 회원 고유번호 |
| uid | string | - | 회원 ID |
| midx | number | - | 매체사 번호 |
| mname | string | Base64 | 매체사명 |
| memo | string | Base64 | 관리자 메모 |
| uname | string | Base64 | 유저 닉네임 |
| adid | string | - | 이용자 ADID |
| isBlocked | boolean | - | 차단 여부 (`true`: 차단, `false`: 정상) |

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": [
    {
      "id": 1,
      "uid": "user001",
      "midx": 1,
      "mname": "64Sk7J20",
      "memo": "",
      "uname": "6rmA66+87KSA",
      "adid": "abc123-def456",
      "isBlocked": false
    },
    {
      "id": 2,
      "uid": "user002",
      "midx": 2,
      "mname": "7Lm07Lm0",
      "memo": "7KO87J2YIOycoOyggA==",
      "uname": "7J207ISc7Jew",
      "adid": "xyz789-ghi012",
      "isBlocked": true
    }
  ],
  "total": 10
}
```

### 사용 예시

```
GET /api/admin-app/users
GET /api/admin-app/users?status=normal&page=1&limit=10
GET /api/admin-app/users?status=blocked
GET /api/admin-app/users?searchType=uname&searchWords=김민준
```

---

## 회원 상태 조회

모달 오픈 시 최신 차단 상태를 확인합니다.

### 엔드포인트

```
GET /api/admin-app/users/status?uid=xx
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| uid | string | 필수 | 회원 ID |

### 성공 응답

```json
{
  "ret": 0,
  "isBlocked": false
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| isBlocked | boolean | 차단 여부 (`true`: 차단, `false`: 정상) |

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 존재하지 않는 회원 | `"회원을 찾을 수 없습니다."` |

---

## 회원 차단/해제

### 엔드포인트

```
POST /api/admin-app/users/toggle-block
```

### 요청 Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| uid | string | 필수 | 회원 ID |
| isBlocked | boolean | 필수 | `true`: 차단, `false`: 차단 해제 |

```json
{
  "uid": "user001",
  "isBlocked": true
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "차단되었습니다."
}
```

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 존재하지 않는 회원 | `"회원을 찾을 수 없습니다."` |

---

## 회원 메모 저장

### 엔드포인트

```
POST /api/admin-app/users/memo
```

### 요청 Body

| 필드 | 타입 | 인코딩 | 필수 | 설명 |
|------|------|--------|------|------|
| uid | string | - | 필수 | 회원 ID |
| memo | string | Base64 | 필수 | 관리자 메모 (Base64 인코딩하여 전송) |

```json
{
  "uid": "user001",
  "memo": "7KO87J2YIOycoOyggA=="
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "메모가 저장되었습니다."
}
```

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 존재하지 않는 회원 | `"회원을 찾을 수 없습니다."` |

---

## 회원 알림 내역 조회

### 엔드포인트

```
GET /api/admin-app/users/{uid}/notifications
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| uid | string | 필수 | 회원 ID |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | Notification[] | 알림 내역 |
| total | number | 전체 페이지 수 |

#### Notification 필드

| 필드 | 타입 | 인코딩 | 설명 |
|------|------|--------|------|
| id | number | - | 알림 ID |
| title | string | Base64 | 알림 제목 |
| message | string | Base64 | 알림 내용 |
| isRead | boolean | - | 읽음 여부 |
| createdAt | string | - | 생성 일시 (ISO 8601) |
| readAt | string | - | 읽은 일시 (ISO 8601, 읽은 경우만) |
| sentBy | string | Base64 | 송신자 (관리자 닉네임) |

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": [
    {
      "id": 1,
      "title": "66y47J2YIOuLteuzgCDslYjrgrQ=",
      "message": "66y47J2Y7ZWY7Iug IOuCtOyaqeyXkCDrjIDtlbQg64u165Oc66a065OcLg==",
      "isRead": false,
      "createdAt": "2024-01-18T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

## 회원 알림 전송

### 엔드포인트

```
POST /api/admin-app/users/send-notification
```

### 요청 Body

| 필드 | 타입 | 인코딩 | 필수 | 설명 |
|------|------|--------|------|------|
| uid | string | - | 필수 | 회원 ID |
| title | string | Base64 | 필수 | 알림 제목 (Base64 인코딩하여 전송) |
| message | string | Base64 | 필수 | 알림 내용 (Base64 인코딩하여 전송, 300자 이내) |

```json
{
  "uid": "user001",
  "title": "66y47J2YIOuLteuzgCDslYjrgrQ=",
  "message": "66y47J2Y7ZWY7Iug IOuCtOyaqeyXkCDrjIDtlbQg64u165Oc66a065OcLg=="
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "알림이 전송되었습니다."
}
```

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 존재하지 않는 회원 | `"회원을 찾을 수 없습니다."` |
| -1 | 제목 누락 | `"제목을 입력해주세요."` |
| -1 | 내용 누락 | `"내용을 입력해주세요."` |

---

## 에러 응답 (공통)

| ret | 상황 |
|-----|------|
| 0 | 성공 |
| 1 | 잘못된 요청 |
| -1 | 서버 오류 |
| 100 | 인증 토큰 오류 |

---

## 화면 구성 참고

### 목록

- 상태 필터: 전체 / 정상 / 정지
- 검색: ID / 닉네임 + 검색어 + 초기화
- 각 항목: 상태 뱃지(전체 정상/전체 차단) + 닉네임 + `#고유번호` + 매체사명 + 회원ID
- 클릭 시 상세 모달 오픈
- 페이지당 10건, `total`은 전체 페이지 수

### 상세 모달

- 헤더: 상태 뱃지 + 닉네임 + `#고유번호` + 탭(회원정보/알림내역)
- **회원정보 탭**: 회원 ID, 닉네임, 매체사, 매체사 번호, ADID, 관리자 메모 (작성/수정/저장 가능)
- **알림내역 탭**: 해당 회원에게 보낸 알림 목록 (읽음/안읽음 구분, 읽은 시간 표시)
- 하단 버튼: 차단하기/차단해제 + 알림보내기 + 닫기
- 차단 시 confirm 확인

### 알림 전송 모달

- 대상 회원 표시
- 제목 입력 (필수)
- 내용 입력 (필수, 300자 이내, 줄바꿈 가능, 글자 수 카운터)
- 전송 버튼 (제목 + 내용 비어있으면 비활성)

### Base64 인코딩

**조회 응답 (디코딩 필요):** `mname`, `memo`, `uname`
