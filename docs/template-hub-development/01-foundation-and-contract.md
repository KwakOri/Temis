# 01. 독립 경계와 데이터 계약

상태: 완료 (2026-07-16)  
선행 단계: 없음

## 1. 목표

기존 두 탭을 수정하지 않고 신규 Hub를 개발할 수 있는 route, 타입, service,
query key, API 경계를 만든다.

이 단계에서는 완성된 목록 UI나 mutation을 구현하지 않는다. 다음 단계가 사용할
안정적인 계약과 최소 화면 골격만 만든다.

## 2. 작업 범위

### 신규 파일 영역

```text
src/app/(root)/admin/template-hub/page.tsx
src/app/(root)/admin/template-hub/_components/
src/components/admin/template-hub/
src/hooks/query/useTemplateHub.ts
src/services/admin/templateHubService.ts
src/services/server/templateHubService.ts
src/app/api/admin/template-hub/templates/route.ts
src/types/template-hub.ts
```

필요한 query key는 기존 `queryKeys.admin` 하위에 추가할 수 있다. 공용 파일 수정이
필요하면 Hub 관련 키만 추가하고 주변 포맷이나 구조를 변경하지 않는다.

### 수정하지 않는 영역

- `TemplateManagement.tsx`
- 기존 Template Studio 관리자 목록
- 기존 두 탭의 route와 표시명
- 공용 상품 편집 페이지
- 기존 판매 API 동작

## 3. route와 인증

- 신규 페이지: `/admin/template-hub`
- 기존 관리자 화면과 같은 관리자 인증 경계를 사용한다.
- 사이드바에는 아직 등록하지 않는다.
- 직접 URL로 접근해 화면과 API를 검증할 수 있어야 한다.
- API는 `requireAdmin` 또는 프로젝트의 동등한 관리자 인증 helper를 사용한다.

## 4. 목록 요청 계약

초기 요청 파라미터:

```ts
type TemplateHubListParams = {
  limit?: number;
  offset?: number;
  search?: string;
  engine?: "legacy" | "studio";
  publicationStatus?: "draft" | "published" | "archived";
  salesType?: "general" | "custom";
  saleStatus?: "selling" | "ready" | "blocked" | "unconfigured";
};
```

기본값:

- `limit=20`
- `offset=0`
- 최신 업데이트 순
- 필터 미지정 시 전 엔진·전 상태

#### 구현 시 추가한 파라미터

02단계의 "상품: 전체 / 미구성 / 구성됨" 필터를 위해 `hasProduct?: boolean`을
추가했다. 기존 값을 바꾸지 않는 선택적 확장이다.

`hasProduct=false`는 `saleStatus="unconfigured"`와 결과가 같지만(상품이 없으면
판매 중일 수도, 판매 준비될 수도 없다), "구성됨"은 단일 `saleStatus` 값으로
표현할 수 없어 별도 파라미터가 필요했다. 두 값 모두 SQL로 판정하므로 readiness
계산 없이 페이지네이션된다.

## 5. 목록 응답 계약

```ts
type TemplateHubItem = {
  id: string;
  name: string;
  description: string;
  templateEngine: "legacy" | "studio";
  publicationStatus: "draft" | "published" | "archived";
  salesType: "general" | "custom";
  shopProductId: string | null;
  hasProduct: boolean;
  hasPurchasablePlan: boolean;
  isShopVisible: boolean;
  linkedArtists: Array<{
    id: string;
    name: string;
    isPrimary: boolean;
  }>;
  saleReadiness: {
    ready: boolean;
    reasons: TemplateSaleBlockReason[];
  };
  createdAt: string;
  updatedAt: string;
};
```

```ts
type TemplateHubListResponse = {
  items: TemplateHubItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  counts: {
    all: number;
    legacy: number;
    studio: number;
    general: number;
    custom: number;
    selling: number;
  };
};
```

DB의 snake_case 행을 UI까지 그대로 노출하지 않는다. server service가 응답
모델로 정규화한다.

## 6. 서비스 경계

### Browser service

`src/services/admin/templateHubService.ts`:

- URL과 query parameter 직렬화
- HTTP 오류 메시지 정규화
- 응답 타입 반환
- UI 상태나 알림 로직 없음

### React Query hook

`src/hooks/query/useTemplateHub.ts`:

- 목록 query
- 안정적인 query key
- `keepPreviousData` 기반 페이지 이동
- mutation은 아직 추가하지 않음

### Server service

`src/services/server/templateHubService.ts`:

- Supabase 조회
- 관계 데이터 정규화
- 판매 준비 상태 계산 진입점
- route response 생성에 필요한 순수 데이터 로직

## 7. 구현 순서

1. Hub 타입 정의
2. server service의 빈 목록 또는 최소 목록 조회 구현
3. GET route 연결
4. browser service 구현
5. React Query hook 구현
6. 인증된 관리자용 최소 page와 loading/error/empty 상태 구현
7. 직접 URL 접근 검증

## 8. 검증

### 정적 검증

- 신규 TypeScript 파일 타입 검사
- 변경 파일 ESLint
- route와 hook의 import 경계 확인

### 동작 검증

- 미인증 요청 거부
- 일반 사용자 요청 거부
- 관리자 요청 성공
- 잘못된 filter 값은 `400`
- 빈 목록도 정상 응답
- 기존 `/admin/templates`, `/admin/template-studio` 동작 불변

## 9. 완료 조건

- [x] `/admin/template-hub` 직접 접근 가능
- [x] 목록 요청·응답 타입 확정
- [x] Page → hook → browser service → API → server service 계층 완성
- [x] 기존 두 탭 파일 diff 없음
- [x] 02단계가 계약 변경 없이 목록 UI를 구현할 수 있음
      (`hasProduct` 선택적 파라미터만 추가)

## 10. 검증 결과 (2026-07-16)

원격 데이터를 복제한 로컬 DB(templates 82건: legacy 81 / studio 1,
일반 판매 10 / 맞춤 제작 72, shop_templates 10건 전부 판매 중) 기준.

- 인증: 미인증 `401`, 일반 사용자 `403`, 관리자 `200`
- 잘못된 filter 값 `400` (`engine`, `limit`, `offset`, `saleStatus`,
  `publicationStatus`, `hasProduct`)
- `counts` 응답이 DB 집계와 일치
- 검색 escape: `%`, `_` 가 wildcard로 동작하지 않고(전체 82건이 아닌 0건),
  쉼표·괄호·따옴표·역슬래시 입력에서 오류 없음
- 페이지 경계: 마지막 페이지 부분 결과, 범위 초과 offset은 빈 목록
- `tsc --noEmit`, 변경 파일 ESLint 통과

