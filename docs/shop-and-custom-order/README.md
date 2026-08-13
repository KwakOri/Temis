# 상점·주문제작 통합 개발 계획

최종 수정: 2026-08-07  
상태: 구현 계획

## 1. 목적

현재 프로젝트의 소비자 판매 흐름을 다음 세 내부 상품 모델로 정리하고, 상점과
주문제작 진입 경험을 하나의 일관된 구조로 만든다.

1. 레거시 v1 시간표 템플릿
2. v2 시간표 템플릿
3. v2 썸네일 템플릿

소비자에게 노출하는 최상위 상품 종류는 `시간표`와 `썸네일` 두 가지다. 레거시
v1과 v2 시간표는 내부 엔진과 실행 경로가 다르지만 `/shop`에서는 같은 시간표
상품군으로 표현한다.

핵심 제품 결정은 다음과 같다.

- 상점 route를 시간표와 썸네일로 분리하지 않는다.
- `/shop` 페이지 하나 안에서 `시간표`와 `썸네일` 탭을 제공한다.
- 시간표 탭에서는 레거시 v1과 v2를 내부적으로 구분하되, 일반 사용자에게는 두
  템플릿을 모두 하나의 `시간표` 상품군처럼 표시한다.
- 주문제작은 `/custom-order` 선택 페이지를 거쳐
  `/custom-order/timetable` 또는 `/custom-order/thumbnail`로 이동한다.
- 썸네일 주문제작의 최종 산출물은 고객 전용 비공개 v2 썸네일 템플릿이다.
- 관리자가 썸네일 주문을 완료하면 별도 인앱 고객 승인 단계 없이 즉시
  `template_access`를 부여한다.
- 기존 공통 상품 카탈로그·권한·구매 신청 구조를 재사용한다.
- 장바구니, 자동 결제, checkout은 이 계획의 범위에 포함하지 않는다. 현재의
  수동 입금 확인 후 구매 신청 흐름을 유지한다.

## 2. 확정 제품 결정

### 2.1 소비자에게 노출되는 상품 종류

내부 데이터 모델은 기존처럼 엔진과 kind를 보존한다.

| 소비자 상품군 | 내부 분류                            | 실행 route              |
| ------------- | ------------------------------------ | ----------------------- |
| 시간표        | `legacy` + `template_kind=null`      | `/time-table/{id}`      |
| 시간표        | `studio` + `template_kind=timetable` | `/template-studio/{id}` |
| 썸네일        | `studio` + `template_kind=thumbnail` | `/thumbnail/{id}`       |

`/shop` 목록과 상품 상세에서는 시간표의 Legacy/Studio 구분을 상품 종류로
표시하지 않는다.

- 카드 badge: `시간표`
- 카드 설명: 시간표 공통 설명
- CTA: `시간표 자세히 보기` 또는 `시간표 사용하기`
- 실행 CTA는 정규화된 `use_href`를 사용하고 엔진 이름을 노출하지 않는다.
- 엔진이 달라도 각 상품의 실제 기능·플랜 차이는 상세 정보로 표시할 수 있다.

관리자용 목록과 운영 화면에서는 장애 대응과 상품 관리를 위해 `Legacy/Studio`,
`draft/published/archived`, `일반 판매/맞춤`을 계속 표시할 수 있다. 마이페이지 등
상점 밖 소비자 화면의 엔진 표시 정책은 해당 화면의 기존 문서를 따르며, 이번
계획에서 일괄 제거하지 않는다.

### 2.2 상점 route와 탭

상점은 `/shop` 하나만 사용한다.

```text
/shop
├── 시간표 탭
│   ├── 레거시 v1 시간표
│   └── v2 시간표
└── 썸네일 탭
    └── v2 썸네일
```

`/shop/timetable`, `/shop/thumbnail` 같은 하위 route를 만들지 않는다. 탭은 같은
페이지에서 목록을 전환한다.

권장 URL 상태는 query parameter다.

```text
/shop                    → 시간표 탭
/shop?kind=timetable     → 시간표 탭
/shop?kind=thumbnail     → 썸네일 탭
```

이 query는 페이지를 분리하는 route가 아니라 새로고침, 직접 링크 공유, 브라우저
뒤로가기를 위한 탭 상태다. 알 수 없는 값은 시간표 탭으로 정규화한다.

초기 탭은 `시간표`와 `썸네일` 두 개만 제공한다. 기존 `전체` 선택지는 제거하며,
향후 실제 탐색 요구가 확인될 때 별도 제품 결정으로 다시 추가한다. 탭 UI는
`tablist`, `tab`, `tabpanel`, 키보드 이동과 선택 상태를 지원한다.

### 2.3 주문제작 route

주문제작은 다음 구조로 정리한다.

```text
/custom-order
├── 시간표 주문제작 선택
└── 썸네일 주문제작 선택

/custom-order/timetable
└── 기존 시간표 주문제작 대문 및 신청 흐름

/custom-order/thumbnail
└── 신규 썸네일 주문제작 대문 및 신청 흐름
```

`/custom-order`는 바로 시간표 안내를 렌더링하지 않고 두 상품군을 선택하는 진입
페이지로 사용한다. 기존 시간표 주문제작 대문은 `/custom-order/timetable`로
이동하되, 안내 문구·가격·옵션·폼 동작은 별도 요구사항이 없는 한 유지한다.

현재 공통 `custom-order/layout.tsx`가 `custom_timetable_orders` 옵션 하나로 전체
하위 route를 차단하는 구조는 제거한다.

- 공통 layout: 공통 화면 프레임만 제공하고 접수 상태로 전체 redirect하지 않음
- 선택 페이지: 두 서비스를 항상 보여주고 종류별 접수 상태를 표시
- 시간표 route: `custom_timetable_orders`로 접수 여부 확인
- 썸네일 route: `custom_thumbnail_orders`로 접수 여부 확인
- 두 서비스 모두 마감: 선택 페이지에서 전체 접수 마감 안내 표시

실제 주문 안내 및 신청은 로그인 사용자만 이용한다. 선택 페이지는 미로그인
사용자도 서비스 종류와 접수 상태를 확인할 수 있다.

### 2.4 썸네일 주문제작 상품 계약

#### 최종 산출물

썸네일 주문 하나의 기본 산출물은 고객 전용 v2 썸네일 템플릿 1개다.

- `templates.template_engine = "studio"`
- `templates.template_kind = "thumbnail"`
- `templates.is_public = false`
- 고객 전용 비공개 템플릿
- 일반 상점에 노출하거나 다른 고객에게 재판매하지 않음
- 주문 row에 `result_template_id`로 결과 템플릿 연결
- 완료 시 주문 고객에게 `template_access` 부여
- 고객 마이페이지에서 사용자용 `/thumbnail/{templateId}` 실행

#### 기본 규격

기본 canvas와 PNG 출력 규격은 `4K UHD, 3840 × 2160, 16:9`다.

- Thumbnail Studio의 일반 기본값 `1280 × 720`을 그대로 사용하지 않는다.
- 고객 전용 주문 템플릿 생성 시 4K canvas를 명시한다.
- 사용자 runtime의 PNG 다운로드도 실제 `3840 × 2160` 결과를 생성해야 한다.
- 4K 렌더링의 메모리, 텍스트 효과, 이미지 품질과 모바일 한계를 별도로 검증한다.
- 다른 비율이나 추가 템플릿은 가격·옵션 정책을 구체화할 때 결정한다.

#### 고객 편집 권한

고객에게는 runtime 편집 권한만 제공한다.

허용:

- 관리자가 공개한 텍스트 입력 변경
- 관리자가 공개한 이미지 입력 변경
- 템플릿이 제공하는 선택형 입력 변경
- PNG 미리보기와 다운로드
- 동일 템플릿의 반복 사용

허용하지 않음:

- 관리자 Thumbnail Studio 진입
- 레이어 구조 변경
- 노드 추가·삭제·이동
- 비공개 입력 또는 템플릿 구조 편집
- 다른 사용자에게 접근 권한 이전

`template_access`는 기존 권한 정책에 따라 유지되며, 별도 만료 정책은 이번 범위에
추가하지 않는다.

#### 가격과 수정 정책

다음 항목은 썸네일 주문제작 페이지를 구체화할 때 확정한다.

- 기본 제작비
- 다른 비율·추가 템플릿·추가 시안 가격
- 빠른 마감 가격
- 포트폴리오 비공개 등 추가 옵션 가격
- 기본 수정 횟수
- 추가 수정 비용
- 단순 수정과 구조 재제작의 경계

가격과 수정 정책이 확정되기 전에는 썸네일 주문제작 페이지 골격과 관리자 제작
흐름을 개발할 수 있지만, 실제 공개 신청을 활성화하지 않는다. 임시 가격을 코드나
DB 운영 데이터에 하드코딩하지 않는다.

#### 마감 일정

썸네일 주문의 기본 마감 요일은 매주 목요일과 일요일이다.

- 날짜 계산 기준 timezone: `Asia/Seoul`
- 자동 제안 마감일은 목요일 또는 일요일 중 하나여야 함
- 시간표 주문 대기열과 썸네일 주문 대기열은 별도로 계산
- 관리자는 고객과 협의한 예외 주문의 마감일을 명시적으로 조정할 수 있음
- 슬롯별 수용량, 당일 접수 cutoff, 빠른 마감 계산은 주문제작 페이지를
  구체화할 때 확정

자동 마감일 API는 임의로 `+7일`을 적용하지 않고, 확정된 대기열 정책과 목·일
달력을 사용한다. 세부 수용량이 확정되기 전에는 화면에 확정 날짜 대신
`목·일요일 마감 / 일정 협의`를 표시할 수 있다.

#### 독점과 포트폴리오

- 고객 전용 비공개 템플릿으로 운영한다.
- 일반 상점이나 다른 고객에게 동일 템플릿을 재판매하지 않는다.
- TEMIS의 포트폴리오 공개는 고객이 동의한 경우에만 허용한다.
- 포트폴리오 동의 여부는 주문 데이터에 명시적으로 저장한다.
- 고객이 사용하는 원본 이미지와 제3자 에셋의 권리는 고객이 제공한 사용 범위에
  한정한다.

#### 완료와 권한 부여

관리자와 고객의 디자인 확인·수정 소통은 서비스 외부 연락 채널에서 이미 끝난
상태를 전제로 한다. 별도의 인앱 고객 승인 단계는 만들지 않는다.

관리자 완료 흐름:

```text
관리자 제작 및 외부 소통 완료
→ 결과 v2 썸네일 템플릿 발행
→ 관리자가 `완료 및 권한 부여` 실행
→ result_template_id 검증
→ template_access idempotent upsert
→ 주문 상태 completed
→ 고객 마이페이지에서 즉시 사용
```

`완료 및 권한 부여` 서버 작업은 다음을 보장한다.

- 결과 템플릿이 존재함
- 결과 템플릿이 `studio + thumbnail`임
- 결과 템플릿이 비공개이고 published 상태임
- 주문 사용자와 access 대상 사용자가 일치함
- 같은 요청을 반복해도 access가 중복 생성되지 않음
- access 부여와 주문 완료 상태 변경 중 하나가 실패하면 완료로 기록하지 않음

발행이 완료되지 않은 템플릿은 주문 완료 처리할 수 없다.

## 3. 현재 구현 기준선

### 3.1 템플릿 분류와 실행

현재 다음 공통 계약이 구현되어 있다.

- `src/utils/templates/consumer-template.ts`
  - Legacy `template_kind=null`을 소비자 시간표로 정규화
  - Studio `timetable`과 `thumbnail`을 구분
  - 허용되지 않은 Legacy route를 fail-closed 처리
- `src/utils/template-links.ts`
  - 엔진과 kind에 따라 실행 route를 계산
- `src/types/template-studio.ts`
  - Studio 문서 타입
- `supabase/migrations/20260802010000_add_template_kind_to_studio_templates.sql`
  - Studio kind 제약과 기존 row backfill

Legacy 시간표는 허용된 UUID route registry에 의존한다. 이 계획은 Legacy 템플릿을
동적 v1 renderer로 재작성하거나 기존 정적 route를 자동 마이그레이션하는 작업을
포함하지 않는다.

### 3.2 현재 상점

관련 파일:

- `src/app/(root)/shop/page.tsx`
- `src/app/api/shop/templates/route.ts`
- `src/app/(root)/shop/[id]/page.tsx`
- `src/components/shop/TemplateDetailContent.tsx`
- `src/hooks/query/useShop.ts`
- `src/services/shopService.ts`

현재 상점은 이미 다음을 지원한다.

- 공통 `shop_templates` 목록
- `template_plans`, `template_artists` 연결
- 시간표/썸네일 kind 필터
- 종류 badge와 종류별 설명
- 공통 상품 상세 route `/shop/[id]`
- 공통 플랜 선택
- 공통 구매 신청 API

현재 부족한 부분:

- 시간표/썸네일이 접근 가능한 탭 UI로 구성되지 않음
- 현재 필터가 `<select>` 중심임
- 탭 선택 상태가 URL과 연결되지 않음
- 시간표 v1/v2를 하나의 소비자 상품군으로 표현한다는 계약이 상점 응답 타입으로
  고정되지 않음
- 상점 API는 전체 `normalizeConsumerTemplate()`가 아니라 kind resolver만 사용해
  Legacy route registry와 정규화된 `use_href`를 상점 계약으로 보장하지 않음
- 썸네일 상품 상세 기능 설명이 시간표에 비해 부족함
- 상점 주문제작 배너가 항상 시간표 문구를 사용함

### 3.3 현재 주문제작

관련 파일:

- `src/app/(root)/custom-order/page.tsx`
- `src/app/(root)/custom-order/layout.tsx`
- `src/components/shop/CustomOrderForm.tsx`
- `src/app/api/shop/custom-order/route.ts`
- `src/app/api/shop/custom-order/estimated-deadline/route.ts`
- `src/hooks/query/useCustomOrder.ts`
- `src/services/customOrderService.ts`
- `src/types/customOrder.ts`

현재 주문제작은 시간표 전용이다.

- 공통 layout이 `custom_timetable_orders` 옵션으로 전체 route를 차단
- `custom_timetable_orders` 테이블에 저장
- `usePriceOptions("timetable")` 사용
- `POST`, `GET`, `PUT`, `DELETE`가 모두 시간표 테이블에 고정
- 예상 마감일 API가 시간표 대기열의 마지막 마감일에 `+7일` 적용
- React Query key와 service가 kind를 구분하지 않음
- API가 요청의 `priceQuoted`를 서버 재계산 없이 저장
- 접수 가능 여부를 클라이언트 layout에서만 검사하고 API에서는 최종 차단하지 않음
- 썸네일 kind, 썸네일 폼, 썸네일 주문 저장 흐름 없음

기존 시간표 주문의 동작을 깨뜨리지 않는 것이 최우선이다. 특히 기존 주문 수정,
가격 옵션, 파일 처리, 관리자 상태 변경, 상충 옵션 검증은 route 이동 과정에서
회귀하지 않아야 한다.

### 3.4 썸네일 Studio 기준선

썸네일 Studio의 제작·발행·카탈로그 연결과 사용자 route는 구현되어 있다.

- 관리자: `/admin/thumbnail-studio`
- 사용자: `/thumbnail/{templateId}`
- 공통 `templates`, Studio document, revision, asset, access 구조 사용
- 일반 Thumbnail Studio 기본 canvas: `1280 × 720`
- 사용자 runtime은 공개된 입력만 수정하고 PNG를 다운로드

주문제작 결과 템플릿은 공통 Studio 저장 구조를 그대로 사용하되 canvas를
`3840 × 2160`으로 생성한다. 별도 썸네일 문서 테이블 세트를 만들지 않는다.

현재 썸네일 사용자 결과와 runtime 입력은 브라우저 로컬 저장 정책을 사용한다.
다른 기기에서 작업을 이어가거나 결과물을 서버에 저장하는 요구사항은 주문제작
템플릿 access와 별개의 후속 범위다.

## 4. 목표 사용자 흐름

### 4.1 일반 상점 구매

```text
/shop 접속
→ 시간표/썸네일 탭 선택
→ 선택한 상품 목록 확인
→ 상품 상세 확인
→ 플랜 선택 및 구매 신청
→ 관리자 승인
→ template_access 생성
→ 마이페이지에서 종류별 runtime 실행
```

시간표 탭은 Legacy v1과 Studio v2 시간표를 함께 표시한다. 소비자 카드에는
`Legacy 시간표`, `Studio 시간표` 대신 모두 `시간표`라고 표시한다. 실제 실행은
정규화된 `use_href`가 담당한다.

썸네일 탭에는 Studio 썸네일만 표시한다. 썸네일 카드와 상세에는 시간표 capability
또는 시간표 전용 기능을 표시하지 않는다.

### 4.2 주문제작 선택

```text
/custom-order
├── 시간표 카드 → /custom-order/timetable
└── 썸네일 카드 → /custom-order/thumbnail
```

각 카드는 접수 가능, 준비 중, 접수 마감 상태를 개별 표시한다. 비활성 상태인
카드는 원인을 설명하고 신청 route 이동을 차단한다.

### 4.3 시간표 주문제작

`/custom-order/timetable`은 기존 `/custom-order`의 기능을 이동한 화면이다.

보존할 기능:

- 기존 로그인 안내
- 예상 마감일 표시
- 시간표 제작 서비스 소개
- 가격 옵션 계산
- 파일 업로드
- 주문 생성·수정·취소
- 기존 상충 옵션 처리
- 마이페이지와 관리자 처리 흐름

### 4.4 썸네일 주문제작

```text
썸네일 주문제작 안내
→ 4K 고객 전용 템플릿 신청
→ 입금 및 외부 연락 채널 소통
→ 관리자 Thumbnail Studio 제작
→ 비공개 v2 썸네일 템플릿 발행
→ 관리자 완료 및 template_access 부여
→ 마이페이지에서 runtime 편집·PNG 다운로드
```

초기 신청 폼 계약:

- 사용 목적
- 기본 규격 `4K UHD 3840 × 2160, 16:9`
- 템플릿에 들어갈 기본 문구와 교체 가능한 문구
- 교체 가능한 이미지 요구사항
- 참고 이미지와 원본 에셋
- 원하는 분위기·색상·구성
- 목·일요일 기준 희망 마감 일정
- 포트폴리오 공개 동의 여부
- 추가 요청사항
- 외부 소통에 사용할 연락처
- 입금자 정보

가격, 추가 규격, 수정 횟수와 비용은 주문제작 페이지를 구체화할 때 확정한다.

## 5. 권장 아키텍처

### 5.1 공통 상점 카탈로그 유지

시간표와 썸네일을 위해 상품 테이블을 분리하지 않는다.

공통 데이터:

- `templates`
- `shop_templates`
- `template_plans`
- `template_artists`
- `template_access`
- `template_purchase_requests`

상점 API는 raw DB row를 그대로 UI에 전달하지 않고 소비자 상점 계약으로
정규화한다.

```ts
type ShopCatalogItem = {
  id: string;
  name: string;
  description: string;
  kind: "timetable" | "thumbnail";
  coverUrl: string | null;
  useHref: string;
  plans: ShopPlanSummary[];
  primaryArtist: ArtistSummary | null;
};
```

정규화 경계에서 다음을 보장한다.

- Legacy route registry에 없는 템플릿 제외
- 잘못된 engine/kind 조합 제외
- Legacy와 Studio timetable 모두 `kind="timetable"`
- 안전한 내부 `useHref`
- 종류별 cover fallback

Page는 `template_engine`을 다시 해석하지 않는다. 목록과 상세 페이지는 같은
service·React Query·API 경계를 사용하며 UI에서 Supabase를 직접 호출하지 않는다.

### 5.2 상점 탭 상태

```ts
type ShopSection = "timetable" | "thumbnail";
```

- 기본값: `timetable`
- query: `?kind=timetable|thumbnail`
- route segment 추가 없음
- `timetable`: Legacy와 Studio timetable을 함께 렌더링
- `thumbnail`: Studio thumbnail만 렌더링
- 정렬과 미구매 필터는 현재 탭 안에서 적용
- 상품 상세 route는 기존 `/shop/[id]` 유지

### 5.3 주문제작 화면과 접수 gate

공통 layout의 시간표 전용 redirect를 제거한다. 종류별 page 또는 nested layout이
각 운영 옵션을 조회한다.

클라이언트 gate만으로 접수를 보호하지 않는다. 주문 생성 API도 요청 시점에 해당
종류의 운영 옵션을 확인하고 비활성 상태면 `409` 또는 명확한 도메인 오류를
반환한다.

### 5.4 주문제작 API 경계

기존 시간표 회귀를 줄이기 위해 기존 endpoint를 시간표 호환 경로로 유지하고,
썸네일 endpoint를 분리한다.

```text
/api/shop/custom-order
├── 기존 시간표 POST/GET/PUT/DELETE
└── /estimated-deadline

/api/shop/custom-order/thumbnail
├── 썸네일 POST/GET/PUT/DELETE
├── /estimated-deadline
└── /complete             관리자 완료 및 권한 부여
```

브라우저 service와 React Query hook은 공통 facade를 제공할 수 있지만 endpoint와
payload는 discriminated union으로 구분한다.

```ts
type CustomOrderKind = "timetable" | "thumbnail";

type TimetableCustomOrderFormData = {
  kind: "timetable";
  // 기존 시간표 필드
};

type ThumbnailCustomOrderFormData = {
  kind: "thumbnail";
  canvas: { width: 3840; height: 2160 };
  // 썸네일 필드
};

type CustomOrderFormData =
  TimetableCustomOrderFormData | ThumbnailCustomOrderFormData;
```

기존 시간표 client가 `kind` 없이 보내는 요청은 호환 경로에서 시간표로 처리할 수
있다. 신규 client는 항상 kind를 명시한다.

모든 수정·취소·관리자 작업은 단순 `orderId`만 전역 식별자로 가정하지 않고
`(kind, orderId)`를 사용한다. kind별 endpoint에서는 route 자체가 kind를
고정한다.

query key도 kind를 포함한다.

```text
customOrder.orders(kind)
customOrder.history(kind)
customOrder.estimatedDeadline(kind)
customOrder.detail(kind, orderId)
```

통합 주문 내역이 필요하면 server service가 두 종류를 공통 summary로 정규화한
전용 aggregate API를 제공한다. 기존 시간표 GET 응답을 예고 없이 혼합 응답으로
바꾸지 않는다.

### 5.5 주문 저장과 결과 템플릿

초기 저장 테이블은 분리한다.

```text
custom_timetable_orders   ← 기존 시간표 주문 유지
custom_thumbnail_orders   ← 신규 썸네일 주문
```

`custom_thumbnail_orders` 최소 필드:

- `id`
- `user_id`
- `status`
- `price_quoted`
- `depositor_name`
- `contact`
- `purpose`
- `canvas_width` 기본값 `3840`
- `canvas_height` 기본값 `2160`
- `requirements`
- `portfolio_consent`
- `requested_deadline`
- `deadline`
- `result_template_id` nullable FK → `templates.id`
- `created_at`, `updated_at`, `completed_at`

DB migration에는 check constraint, FK, 필요한 index, RLS/접근 정책, generated
Supabase type 갱신을 포함한다.

`result_template_id`는 다음 조합만 허용하도록 서버 완료 작업에서 검증한다.

```text
template_engine=studio
template_kind=thumbnail
is_public=false
status=published
```

### 5.6 주문 파일

기존 시간표 주문의 `files.order_id` 계약을 썸네일 주문에 억지로 재사용하지 않는다.
초기에는 명시적 연결 테이블을 추가한다.

```text
custom_thumbnail_order_files
- order_id FK → custom_thumbnail_orders.id
- file_id FK → files.id
- role: source | reference | deliverable
- created_at
- unique(order_id, file_id, role)
```

파일 연결 시 서버는 로그인 사용자 또는 관리자 권한, 파일 소유권, 허용된 파일
종류·용량을 검증한다. 고객 입력 파일과 최종 납품 참고 파일을 role로 구분한다.
실제 제품 산출물은 발행된 v2 템플릿이며, `deliverable` 파일은 필요한 경우의 보조
자료다.

### 5.7 가격과 접수 검증

접수 가능 여부와 가격은 서버를 최종 기준으로 한다.

- 시간표 API에도 `custom_timetable_orders` 활성 상태 서버 검증 추가
- 썸네일 API는 `custom_thumbnail_orders` 활성 상태 서버 검증
- 클라이언트가 전달한 `priceQuoted`를 그대로 권위 있는 값으로 저장하지 않음
- DB 가격 옵션과 선택 옵션으로 서버가 재계산하거나, 가격 정책 미확정 상태에서는
  신청 API를 비활성화
- 가격 불일치 시 저장하지 않고 명확한 오류 반환

썸네일 가격 정책이 확정되기 전에는 `custom_thumbnail_orders` 운영 옵션을
활성화하지 않는다.

관리자는 설정 화면의 `맞춤 썸네일 가격 옵션`에서 가격 패키지를 추가·수정·공개한
뒤 `썸네일 주문제작 접수` 토글을 켠다. 공개된 썸네일 가격 옵션이 하나도 없으면
설정 화면과 서버 모두 접수 활성화를 차단한다. 별도 환경변수로 가격 확정 상태를
관리하지 않는다.

### 5.8 마감일 계산

시간표와 썸네일 예상 마감일 endpoint 및 query cache를 분리한다.

썸네일 마감일 규칙:

- 기준 timezone `Asia/Seoul`
- 자동 날짜는 목요일 또는 일요일
- active 썸네일 주문만 썸네일 대기열 계산에 포함
- completed/cancelled 주문 제외
- 관리자 override 허용
- 슬롯 수용량과 접수 cutoff 확정 전에는 확정 날짜 계산을 공개하지 않음

### 5.9 관리자 완료와 access

`완료 및 권한 부여`는 서버의 단일 도메인 작업으로 처리한다. 클라이언트가
`template_access` insert와 주문 status update를 두 번 호출하지 않는다.

권장 구현은 DB transaction 또는 원자성을 보장하는 RPC/server transaction
경계다.

```text
입력: thumbnailOrderId, resultTemplateId
검증: 관리자, 주문 사용자, 주문 상태, 결과 템플릿 분류·공개·발행 상태
처리: result_template_id 저장 → template_access upsert → completed 상태 변경
결과: 하나의 access와 완료된 주문
```

동일 요청 재실행은 idempotent해야 한다. 실패 시 일부 완료 상태를 남기지 않는다.
성공 후 관리자 주문 목록, 사용자 주문 내역, 사용자 템플릿 목록, access query를
무효화한다.

## 6. 단계별 구현 계획

### Phase 0. 계약 확정과 준비 상태

완료된 결정:

- [x] `/shop` 단일 route와 시간표/썸네일 탭
- [x] Legacy v1과 Studio v2 시간표의 소비자 상품군 통합
- [x] `/custom-order` 선택 페이지와 두 하위 route
- [x] 썸네일 결과는 고객 전용 비공개 v2 템플릿
- [x] 기본 규격은 4K UHD `3840 × 2160`
- [x] 고객은 runtime 편집 권한만 사용
- [x] 기본 마감 요일은 목요일과 일요일
- [x] 고객 전용·재판매 금지·포트폴리오 사전 동의
- [x] 관리자 완료 시 별도 인앱 승인 없이 즉시 access 부여

공개 신청 전 남은 제품 결정:

- [ ] 기본 가격과 추가 옵션 가격
- [ ] 기본 수정 횟수와 추가 수정 정책
- [ ] 목·일 마감 슬롯 수용량과 당일 접수 cutoff

완료 기준:

- [ ] 구현 준비 항목과 공개 신청 차단 항목을 구분할 수 있다.
- [ ] 가격·수정 정책 미확정 상태에서 운영 옵션이 활성화되지 않는다.

### Phase 1. `/shop` 탭과 소비자 계약

대상 파일 후보:

- `src/app/(root)/shop/page.tsx`
- `src/app/api/shop/templates/route.ts`
- `src/components/templates/template-kind-badge.tsx`
- `src/hooks/query/useShop.ts`
- `src/services/shopService.ts`
- `src/types/shop.ts`
- `src/utils/templates/consumer-template.ts`

작업:

- [ ] 기존 kind select를 접근 가능한 시간표/썸네일 탭으로 교체
- [ ] `?kind=` query와 탭 상태 동기화
- [ ] 상점 응답을 정규화된 소비자 상품 계약으로 변경
- [ ] Legacy route registry와 `useHref`를 API 경계에서 검증
- [ ] 시간표 탭에 Legacy와 Studio timetable을 모두 표시
- [ ] 시간표 카드에서 엔진 표기를 추가하지 않음
- [ ] 썸네일 탭에 Studio thumbnail만 표시
- [ ] 정렬과 미구매 필터 유지
- [ ] 주문제작 CTA를 `/custom-order` 선택 페이지로 연결

완료 기준:

- [ ] 하위 route 없이 `/shop`에서 두 탭을 전환할 수 있다.
- [ ] 시간표 v1/v2가 동일한 `시간표` 종류로 보인다.
- [ ] 잘못된 Legacy id와 engine/kind 조합이 노출되지 않는다.
- [ ] 새로고침과 직접 링크에서 탭이 유지된다.

### Phase 2. 상품 상세와 구매 UX

- [ ] 기존 `/shop/[id]` 유지
- [ ] 시간표 상세는 엔진명이 아니라 기능·플랜 차이를 표시
- [ ] 썸네일 상세에 공개 입력과 PNG 다운로드 안내 추가
- [ ] 브라우저 로컬 runtime 저장 범위 안내
- [ ] 썸네일 상품에서 시간표 capability 숨김
- [ ] 구매 신청은 공통 `template_purchase_requests` 유지
- [ ] 구매 완료 사용 CTA는 정규화된 `useHref` 사용

### Phase 3. 주문제작 선택 페이지와 시간표 route 이동

대상 파일 후보:

- `src/app/(root)/custom-order/layout.tsx`
- `src/app/(root)/custom-order/page.tsx`
- `src/app/(root)/custom-order/timetable/page.tsx`
- `src/app/(root)/custom-order/thumbnail/page.tsx`
- `src/app/(root)/shop/page.tsx`

작업:

- [ ] 공통 layout의 시간표 전용 전체 redirect 제거
- [ ] `/custom-order`에 종류별 상태를 가진 두 선택 카드 추가
- [ ] 기존 시간표 대문을 `/custom-order/timetable`로 이동 또는 추출
- [ ] 기존 시간표 폼·hook·수정·취소 동작 보존
- [ ] 시간표 page와 API에 종류별 접수 gate 적용
- [ ] 썸네일 route는 가격 정책 확정 전 `준비 중` 상태 제공
- [ ] 기존 내부 링크와 마이페이지 수정 링크 회귀 확인

### Phase 4. 썸네일 주문 데이터와 API

- [ ] `custom_thumbnail_orders` migration
- [ ] `custom_thumbnail_order_files` migration
- [ ] `result_template_id`와 완료 원자성 계약 구현
- [ ] generated Supabase type 갱신
- [ ] discriminated union 주문 타입 추가
- [ ] 썸네일 browser service와 React Query hook 추가
- [ ] kind별 query key와 invalidation 추가
- [ ] 썸네일 POST/GET/PUT/DELETE 구현
- [ ] 종류별 server-side 접수 gate 구현
- [ ] 목·일 마감일 유틸과 endpoint 구현 준비
- [ ] 관리자 완료·access 부여 endpoint 구현

### Phase 5. 4K 썸네일 주문제작 화면

- [ ] 4K 기본 상품 안내
- [ ] runtime 전용 사용 범위 안내
- [ ] 썸네일 신청 form
- [ ] 입력·참고 이미지 업로드
- [ ] 포트폴리오 동의 입력
- [ ] 목·일 마감 일정 안내
- [ ] 가격·수정 정책 확정 전 제출 비활성화
- [ ] 정책 확정 후 DB 가격 옵션과 서버 계산 연결
- [ ] 성공·실패·중복 제출 상태 처리

### Phase 6. 관리자 제작과 즉시 권한 부여

- [ ] 관리자 주문 목록에 시간표/썸네일 badge 추가
- [ ] 썸네일 주문 상세와 입력 파일 확인
- [ ] 주문에서 고객 전용 Thumbnail Studio 템플릿 생성
- [ ] 신규 문서 canvas를 `3840 × 2160`으로 설정
- [ ] 주문과 결과 템플릿 연결
- [ ] 결과 템플릿 분류·비공개·발행 검증
- [ ] `완료 및 권한 부여` 단일 action
- [ ] access upsert와 completed 상태 변경 원자성
- [ ] 완료 후 고객 마이페이지 cache 갱신
- [ ] 별도 인앱 고객 승인 단계가 없는지 확인

### Phase 7. 회귀와 운영 검증

- [ ] 로컬 migration과 fixture 검증
- [ ] 시간표 기존 주문 생성·수정·취소 회귀 검증
- [ ] 상점 v1/v2 시간표 통합 표시 검증
- [ ] 썸네일 주문부터 access 부여까지 수직 흐름 검증
- [ ] 4K runtime 편집과 PNG export 실측
- [ ] 모바일 4K export 한계와 사용자 안내 확정
- [ ] 종류별 접수 on/off 검증
- [ ] 관련 docs 상태 갱신

## 7. 데이터·권한 불변식

- 상품의 canonical id는 항상 `templates.id`다.
- 상점 목록은 기존 판매·공개·발행 조건을 유지한다.
- Legacy route registry에 없는 id로 실행 fallback을 만들지 않는다.
- 시간표와 썸네일은 공통 `template_access`와 `template_artists` 권한 흐름을
  사용한다.
- 시간표 v1/v2 통합은 상점 표시 정책이며 내부 실행 route와 저장 모델을 바꾸지
  않는다.
- 썸네일 상품에는 시간표 capability와 시간표 전용 feature를 표시하지 않는다.
- 고객 전용 썸네일 주문 결과는 `studio + thumbnail + is_public=false`다.
- 고객은 runtime 입력만 편집하고 Studio 구조를 편집할 수 없다.
- 기본 주문 canvas와 PNG 결과는 `3840 × 2160`이다.
- 비공개 주문 템플릿은 일반 상점에 노출하거나 재판매하지 않는다.
- 포트폴리오 공개는 명시적 동의가 있어야 한다.
- 주문 완료는 유효한 published 결과 템플릿과 access 부여 없이는 성공할 수 없다.
- 완료 action은 idempotent하며 부분 완료를 남기지 않는다.
- 주문 API는 종류별 접수 가능 여부를 서버에서 검사한다.
- 가격은 서버 정책을 최종 기준으로 한다.
- 원격 Supabase migration과 `db push --linked`는 별도 사용자 승인 없이 실행하지
  않는다.

## 8. 검증 계획

프로젝트 규칙에 따라 production build는 기본 검증에서 제외하고 lint,
TypeScript, 관련 check script와 브라우저 실측을 우선한다.

### 정적 검증

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] 상점 consumer 계약·Legacy registry check
- [ ] 주문 kind·schema·가격·접수 gate check
- [ ] migration·RLS·FK check
- [ ] 완료 및 access 부여 idempotency check

### 상점 브라우저 검증

- [ ] `/shop`에서 시간표 탭 기본 표시
- [ ] `?kind=thumbnail` 직접 접근과 새로고침 유지
- [ ] 시간표 탭에 Legacy v1과 Studio v2 함께 표시
- [ ] 두 엔진 모두 동일한 `시간표` badge와 문구 사용
- [ ] 각 시간표의 실제 실행 route 정상 이동
- [ ] 썸네일 탭에 Studio 썸네일만 표시
- [ ] 썸네일 상품에 시간표 기능 미노출
- [ ] 탭 키보드 조작과 모바일 레이아웃 확인

### 주문제작 브라우저 검증

- [ ] `/custom-order`에 두 선택 카드와 개별 접수 상태 표시
- [ ] 시간표 선택 시 `/custom-order/timetable` 이동
- [ ] 썸네일 선택 시 `/custom-order/thumbnail` 이동
- [ ] 시간표 마감이 썸네일 route를 차단하지 않음
- [ ] 썸네일 마감이 시간표 route를 차단하지 않음
- [ ] 미로그인 안내와 로그인 이동 확인
- [ ] 시간표 기존 주문 생성·수정·취소 회귀 확인
- [ ] 가격 미확정 상태에서 썸네일 제출 차단
- [ ] 썸네일 파일 소유권과 업로드 제한 확인
- [ ] 목·일 이외 자동 마감일이 생성되지 않음

### 썸네일 결과와 권한 검증

- [ ] 주문 결과 템플릿 canvas `3840 × 2160`
- [ ] 결과 템플릿 `studio + thumbnail + is_public=false + published`
- [ ] 고객 runtime에서 공개 입력만 수정 가능
- [ ] 관리자 Studio route 접근은 부여되지 않음
- [ ] 실제 4K PNG 다운로드 크기 확인
- [ ] 완료 전 사용자 access 없음
- [ ] 관리자 완료 직후 access 생성 및 마이페이지 노출
- [ ] 완료 요청 반복 시 access 중복 없음
- [ ] access 실패 시 주문이 completed로 남지 않음
- [ ] 고객 승인용 인앱 단계가 생성되지 않음
- [ ] 포트폴리오 미동의 주문의 외부 공개 차단

## 9. 범위 제외

- `/shop/timetable`, `/shop/thumbnail` 독립 route
- 시간표와 썸네일 일반 상품 테이블 분리
- Legacy v1 전체의 동적 renderer 이관
- 자동 PG 결제, 장바구니, checkout
- 고객의 관리자 Thumbnail Studio 구조 편집
- 썸네일 runtime 결과의 서버 프로젝트 저장·기기 간 동기화
- 고객 최종 확인을 위한 별도 인앱 승인 단계
- 고객 전용 주문 템플릿의 일반 상점 재판매
- 가격·수정 정책 확정 전 임시 운영 가격 하드코딩
- 기존 시간표 주문 데이터의 자동 공통 테이블 이관
- 운영 DB에 대한 자동 migration push

## 10. 관련 문서와 구현 위치

관련 문서:

- [사용자 템플릿 UI 통합](../user-template-ui-integration/README.md)
- [상점·상품 종류별 UX](../user-template-ui-integration/05-shop-and-product-kind-ux.md)
- [권한·구매·관리자 연결 UI](../user-template-ui-integration/06-entitlement-purchase-admin-ui.md)
- [Thumbnail Studio README](../thumbnail-studio/README.md)
- [Thumbnail Studio 사용자 runtime](../thumbnail-studio/05-runtime-export.md)
- [Thumbnail Studio 저장·카탈로그](../thumbnail-studio/06-persistence-catalog.md)
- [시간표 주문 옵션 계획](../CUSTOM_ORDER_EXCLUSIVE_OPTIONS_IMPLEMENTATION_PLAN.md)

주요 구현 위치:

- `src/app/(root)/shop/page.tsx`
- `src/app/(root)/shop/[id]/page.tsx`
- `src/app/(root)/custom-order/layout.tsx`
- `src/app/(root)/custom-order/page.tsx`
- `src/app/api/shop/templates/route.ts`
- `src/app/api/shop/custom-order/route.ts`
- `src/app/api/shop/custom-order/estimated-deadline/route.ts`
- `src/components/shop/CustomOrderForm.tsx`
- `src/components/shop/TemplateDetailContent.tsx`
- `src/hooks/query/useShop.ts`
- `src/hooks/query/useCustomOrder.ts`
- `src/services/shopService.ts`
- `src/services/customOrderService.ts`
- `src/utils/templates/consumer-template.ts`
- `src/utils/template-links.ts`

이 문서의 체크리스트는 구현 단계가 시작될 때 실제 변경 파일, migration과 검증
결과를 추가해 갱신한다.
