# FAQ API (관리자용)

관리자 페이지에서 자주묻는 질문(FAQ)을 조회하고 관리하는 API입니다. 카테고리별 필터링 및 페이지네이션을 지원합니다.

## 인증

- `Authorization: Bearer {token}` 헤더 필요
- 토큰 만료 시 401 응답

---

## API 목록

| API | 메서드 | 엔드포인트 | 설명 |
|-----|--------|-----------|------|
| FAQ 목록 조회 | GET | `/api/admin-app/faq` | 카테고리 필터/페이지네이션 지원 |
| FAQ 카테고리 목록 조회 | GET | `/api/admin-app/faq/categories` | 카테고리 ID/라벨 목록 |
| FAQ 카테고리 등록 | POST | `/api/admin-app/faq/categories` | 새 카테고리 등록 |
| FAQ 카테고리 수정 | PUT | `/api/admin-app/faq/categories/{id}` | 카테고리 라벨 수정 |
| FAQ 카테고리 삭제 | DELETE | `/api/admin-app/faq/categories/{id}` | 카테고리 삭제 |
| FAQ 등록 | POST | `/api/admin-app/faq` | 새 FAQ 등록 |
| FAQ 수정 | PUT | `/api/admin-app/faq/{id}` | 질문/답변/카테고리 수정 |
| FAQ 삭제 | DELETE | `/api/admin-app/faq/{id}` | FAQ 삭제 |

---

## 1. FAQ 목록 조회

### 엔드포인트

```
GET /api/admin-app/faq
```

### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 기본값 |
|---------|------|------|------|--------|
| page | number | 선택 | 페이지 번호 | 1 |
| limit | number | 선택 | 페이지당 항목 수 | 10 |
| category | string | 선택 | 카테고리 필터 (카테고리 목록 API에서 조회) | 전체 |

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | FaqItem[] | FAQ 항목 배열 |
| total | number | 전체 페이지 수 |

#### FaqItem 필드

| 필드 | 타입 | 인코딩 | 설명 |
|------|------|--------|------|
| id | number | - | FAQ ID |
| question | string | Base64 | 질문 |
| answer | string | Base64 | 답변 |
| category | string | - | 카테고리 (`mission`, `reward`, `account`, `etc`) |

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": [
    {
      "id": 1,
      "question": "66+87IS47J2AIOyWtOq4sCDsiJjti4ntlZjrgpjsmpQ/",
      "answer": "7IKs7Jqp7J6QIOyVseyXkOyEnCDrr...",
      "category": "mission"
    },
    {
      "id": 2,
      "question": "66as7JuM65Oc64qUIOyWuOygnCDsp4DquIntlZjrgpjsmpQ/",
      "answer": "66as7JuM65OcIOyngOq4ieydhCDsm...",
      "category": "reward"
    }
  ],
  "total": 3
}
```

### 사용 예시

```
GET /api/admin-app/faq
GET /api/admin-app/faq?page=1&limit=10
GET /api/admin-app/faq?category=mission
GET /api/admin-app/faq?category=reward&page=2
```

---

## 2. FAQ 카테고리 목록 조회

### 엔드포인트

```
GET /api/admin-app/faq/categories
```

### 응답

| 필드 | 타입 | 설명 |
|------|------|------|
| ret | number | 결과 코드 (0: 성공) |
| data | FaqCategory[] | 카테고리 배열 |

#### FaqCategory 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 카테고리 ID |
| label | string | 카테고리 표시명 |

### 성공 응답 예시

```json
{
  "ret": 0,
  "data": [
    { "id": "mission", "label": "미션" },
    { "id": "reward", "label": "리워드" },
    { "id": "account", "label": "계정" },
    { "id": "etc", "label": "기타" }
  ]
}
```

---

## 3. FAQ 카테고리 등록

### 엔드포인트

```
POST /api/admin-app/faq/categories
```

### 요청 Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | 필수 | 카테고리 ID (영문 소문자, 중복 불가) |
| label | string | 필수 | 카테고리 표시명 |

```json
{
  "id": "payment",
  "label": "결제"
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "카테고리가 등록되었습니다."
}
```

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 키 누락 | `"카테고리 ID를 입력해주세요."` |
| -1 | 라벨 누락 | `"카테고리 이름을 입력해주세요."` |
| -1 | 키 중복 | `"이미 존재하는 카테고리 ID입니다."` |

---

## 4. FAQ 카테고리 수정

### 엔드포인트

```
PUT /api/admin-app/faq/categories/{id}
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | 필수 | 카테고리 ID |

### 요청 Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| label | string | 필수 | 새 카테고리 표시명 |

```json
{
  "label": "결제/환불"
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "카테고리가 수정되었습니다."
}
```

---

## 5. FAQ 카테고리 삭제

### 엔드포인트

```
DELETE /api/admin-app/faq/categories/{id}
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | string | 필수 | 카테고리 ID |

### 성공 응답

```json
{
  "ret": 0,
  "message": "카테고리가 삭제되었습니다."
}
```

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 해당 카테고리의 FAQ 존재 | `"해당 카테고리에 FAQ가 존재하여 삭제할 수 없습니다."` |

---

## 6. FAQ 등록

### 엔드포인트

```
POST /api/admin-app/faq
```

### 요청 Body

| 필드 | 타입 | 인코딩 | 필수 | 설명 |
|------|------|--------|------|------|
| question | string | Base64 | 필수 | 질문 (Base64 인코딩하여 전송) |
| answer | string | Base64 | 필수 | 답변 (Base64 인코딩하여 전송) |
| category | string | - | 필수 | 카테고리 (`mission`, `reward`, `account`, `etc`) |

```json
{
  "question": "66+87IS47J2AIOyWtOq4sCDsiJjti4ntlZjrgpjsmpQ/",
  "answer": "7IKs7Jqp7J6QIOyVseyXkOyEnCDrr...",
  "category": "mission"
}
```

### 성공 응답

```json
{
  "ret": 0,
  "message": "FAQ가 등록되었습니다."
}
```

### 에러 응답

| ret | 상황 | message 예시 |
|-----|------|-------------|
| -1 | 질문 누락 | `"질문을 입력해주세요."` |
| -1 | 답변 누락 | `"답변을 입력해주세요."` |
| -1 | 카테고리 누락 | `"카테고리를 선택해주세요."` |

---

## 7. FAQ 수정

### 엔드포인트

```
PUT /api/admin-app/faq/{id}
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | 필수 | FAQ ID |

### 요청 Body

| 필드 | 타입 | 인코딩 | 필수 | 설명 |
|------|------|--------|------|------|
| question | string | Base64 | 필수 | 질문 |
| answer | string | Base64 | 필수 | 답변 |
| category | string | - | 필수 | 카테고리 |

### 성공 응답

```json
{
  "ret": 0,
  "message": "FAQ가 수정되었습니다."
}
```

---

## 8. FAQ 삭제

### 엔드포인트

```
DELETE /api/admin-app/faq/{id}
```

### Path 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| id | number | 필수 | FAQ ID |

### 성공 응답

```json
{
  "ret": 0,
  "message": "FAQ가 삭제되었습니다."
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

## Base64 인코딩

**조회 응답 (디코딩 필요):** `question`, `answer`

**등록/수정 요청 (인코딩 필요):** `question`, `answer`

---

## 화면 구성 참고

### 목록

- 헤더: 제목 + **FAQ 등록** 버튼
- 카테고리 필터: 전체 / 미션 / 리워드 / 계정 / 기타 (카테고리 API에서 동적 조회)
- 각 항목: 카테고리 뱃지 + 질문 + 답변 미리보기
- 클릭 시 상세 모달 오픈
- 페이지당 10건, `total`은 전체 페이지 수

### 상세 모달

- **헤더**: 카테고리 뱃지, `#ID`
- **본문**: 질문 (굵게) + 답변 (줄바꿈 유지)
- **하단 버튼**: 수정 + 삭제 + 닫기
- 삭제 시 confirm 확인

### 등록/수정 모달

- 카테고리 선택 (필수, 카테고리 API에서 동적 조회)
- 질문 입력 (필수)
- 답변 입력 (필수, 300자 이내, 줄바꿈 가능, 글자 수 카운터)
- 등록/수정 버튼 (질문 + 답변 + 카테고리 비어있으면 비활성)

### 카테고리 관리

- 카테고리 필터 영역 우측에 **카테고리 관리** 버튼
- 모달에서 카테고리 추가/수정/삭제
- 추가: 키(영문 소문자) + 표시명 입력
- 수정: 표시명 인라인 편집
- 삭제: 해당 카테고리에 FAQ가 있으면 삭제 불가
