# 공지사항 API (관리자용)

관리자 페이지에서 앱 공지사항을 조회하는 API입니다.

## 인증

- `Authorization: Bearer {token}` 헤더 필요
- 토큰 만료 시 401 응답

---

## API 목록

| API | 메서드 | 엔드포인트 | 설명 |
|-----|--------|-----------|------|
| 공지사항 목록 조회 | GET | `/api/admin-app/notices` | 필터/페이지네이션 지원 |
| 공지사항 등록 | POST | `/api/admin-app/notices` | 새 공지사항 등록 |
| 공지사항 수정 | PUT | `/api/admin-app/notices/{id}` | 제목/내용/중요 수정 |
| 공지사항 삭제 | DELETE | `/api/admin-app/notices/{id}` | 공지사항 삭제 |
| 공지사항 활성화/비활성화 | PUT | `/api/admin-app/notices/{id}/active` | 활성 상태 토글 |

---

## 공지사항 목록 조회

### 엔드포인트

```
GET /api/admin-app/notices
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| isImportant | string | 선택 | 중요 공지 필터 (`true`: 중요, `false`: 일반) | 전체 |
| page | number | 선택 | 페이지 번호 | 1 |
| limit | number | 선택 | 페이지당 항목 수 | 7 |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | Notice[] | 공지사항 목록 |
| total | number | 전체 공지사항 수 |

#### Notice 필드

| 필드 | 타입 | 인코딩 | 설명 |
|------|------|--------|------|
| id | number | - | 공지사항 ID |
| title | string | Base64 | 제목 |
| content | string | Base64 | 내용 |
| createdAt | string | - | 등록 일시 (ISO 8601) |
| isImportant | boolean | - | 중요 공지 여부 (선택, 없으면 일반) |
| isActive | boolean | - | 활성화 여부 (선택, 없으면 활성) |
| createdBy | string | Base64 | 등록자 |
| updatedAt | string | - | 수정 일시 (ISO 8601, 수정된 경우만) |
| updatedBy | string | Base64 | 수정자 (수정된 경우만) |

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": [
    {
      "id": 1,
      "title": "7ISc67mE7IqkIOygkOqygCDslYjrgrQ=",
      "content": "MjAyNOuFhCAxzJsgMjDsnbwgMDI6MDAgfiAwNjowMCDshJzruYTsiqQg7KCQ6rKA7J20IOyYiOygle2VmOuNkCDsnojsirXri4jri6Qu",
      "createdAt": "2024-01-18T10:00:00Z",
      "isImportant": true
    },
    {
      "id": 2,
      "title": "7IOI66Gc7JqEIOuvuOyFmCDstpTqsIAg7JWI64K0",
      "content": "6ri47LC+6riwIOuvuOyFmOydtCDsg4jroa3qsowg7LaU6rCA65CY7JeI7Iq164uI64ukLg==",
      "createdAt": "2024-01-15T09:00:00Z",
      "isImportant": false
    },
    {
      "id": 3,
      "title": "66as7JuM65OcIOyngOq4iSDquLDspIAg67OA6rK9IOyViOuCtA==",
      "content": "MjAyNOuFhCAy7JuUIDHsnbzrtoDF4oCmLg==",
      "createdAt": "2024-01-10T14:30:00Z"
    }
  ],
  "total": 1
}
```

### 사용 예시

```
GET /api/admin-app/notices
GET /api/admin-app/notices?page=1&limit=10
GET /api/admin-app/notices?isImportant=true
GET /api/admin-app/notices?isImportant=false&page=2
```

---

## 공지사항 등록

### 엔드포인트

```
POST /api/admin-app/notices
```

### 요청 Body

| 필드 | 타입 | 인코딩 | 필수 | 설명 |
|------|------|--------|------|------|
| title | string | Base64 | 필수 | 제목 (Base64 인코딩하여 전송) |
| content | string | Base64 | 필수 | 내용 (Base64 인코딩하여 전송) |
| isImportant | boolean | - | 선택 | 중요 공지 여부 (기본값: false) |

```json
{
  "title": "7ISc67mE7IqkIOygkOqygCDslYjrgrQ=",
  "content": "MjAyNOuFhCAxzJsgMjDsnbwgMDI6MDAgfiAwNjowMCDshJzruYTsiqQg7KCQ6rKA7J20IOyYiOygle2VmOuNkCDsnojsirXri4jri6Qu",
  "isImportant": true
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "공지사항이 등록되었습니다."
}
```

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 제목 누락 | `"제목을 입력해주세요."` |
| -1 | 내용 누락 | `"내용을 입력해주세요."` |

---

## 공지사항 수정

### 엔드포인트

```
PUT /api/admin-app/notices/{id}
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | 필수 | 공지사항 ID |

### 요청 Body

| 필드 | 타입 | 인코딩 | 필수 | 설명 |
|------|------|--------|------|------|
| title | string | Base64 | 필수 | 제목 |
| content | string | Base64 | 필수 | 내용 |
| isImportant | boolean | - | 선택 | 중요 공지 여부 |

### 성공 응답

```json
{
  "ret": 0,
  "message": "공지사항이 수정되었습니다."
}
```

---

## 공지사항 삭제

### 엔드포인트

```
DELETE /api/admin-app/notices/{id}
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | 필수 | 공지사항 ID |

### 성공 응답

```json
{
  "ret": 0,
  "message": "공지사항이 삭제되었습니다."
}
```

---

## 공지사항 활성화/비활성화

### 엔드포인트

```
PUT /api/admin-app/notices/{id}/active
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | 필수 | 공지사항 ID |

### 요청 Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| isActive | boolean | 필수 | `true`: 활성화, `false`: 비활성화 |

```json
{
  "isActive": false
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "비활성화되었습니다."
}
```

---

## 에러 응답 (공통)

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

## 화면 구성 참고

### 목록

- 헤더: 제목 + **공지 등록** 버튼
- 필터: 전체 / 중요 / 일반
- **중요 공지는 모든 페이지에서 상단 고정** (일반 필터 시 숨김)
- 일반 공지: 페이지네이션 적용
- 페이지당 7건 (중요 공지 수 포함 계산: 1페이지에서 중요 4건이면 일반 3건)
- `total`은 전체 공지사항 수
- 비활성 공지는 흐리게 표시 + 비활성 뱃지

### 상세 모달

- 헤더: 비활성 뱃지 + 중요 뱃지 + `#공지ID`
- 본문: 제목 + 등록일 + 내용 (줄바꿈 유지)
- 하단 버튼: 비활성화/활성화 + 수정 + 삭제 + 닫기
- 삭제 시 confirm 확인

### 등록/수정 모달

- 제목 입력 (필수)
- 내용 입력 (필수, 300자 이내, 줄바꿈 가능, 글자 수 카운터)
- 중요 공지 체크박스
- 등록/수정 버튼 (제목 + 내용 비어있으면 비활성)

### Base64 인코딩

**조회 응답 (디코딩 필요):** `title`, `content`, `createdBy`, `updatedBy`

**등록/수정 요청 (인코딩 필요):** `title`, `content`
