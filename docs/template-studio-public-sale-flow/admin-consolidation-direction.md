# 구·신 템플릿 관리화면 통합 방향 검토

최종 수정: 2026-07-16

관련 문서: [공개 템플릿 판매 흐름 점검 및 로드맵](./README.md),
[템플릿 시스템 통합 개발 개요](../template-system-integration/README.md)

## 검토 목적

관리자 사이드바에 템플릿을 다루는 탭이 두 개 존재한다.

- **구 화면**: "Templates" 탭 → `TemplateManagement.tsx`
  (`src/components/admin/TemplateManagement.tsx`, 약 2,000줄)
- **신 화면**: "Template Studio" 탭 → `/admin/template-studio`
  (`src/app/(root)/admin/template-studio/`)

두 화면 모두 통합된 `templates` 테이블을 다루므로 같은 템플릿이 두 곳에
중복 노출된다. 이 문서는 두 화면을 어떤 방향으로 통합할지 코드 현황을
기준으로 검토하고 권장안을 제시한다.

## 코드 현황 (2026-07-16 기준)

### 기능 보유 현황 비교

| 기능 | 구 Templates 탭 | 신 Template Studio 탭 |
| --- | --- | --- |
| 목록 대상 | **전 엔진** (`legacy` + `studio`) | `studio` 엔진만 (`.eq("template_engine", "studio")`) |
| 검색 | 있음 (디바운스 서버 검색) | 없음 |
| 페이지네이션 | 있음 (서버사이드, 20개 단위) | 없음 (전체 로드) |
| 공개/비공개 구분 | 탭으로 분리 (`visibility` 파라미터) | 없음 (`is_public`을 조회조차 안 함) |
| 엔진·게시 상태 배지 | 있음 (Legacy/Studio + draft/published/archived) | 게시 상태만 |
| 판매 시작/중지 | 있음 (`is_shop_visible` 토글 + 작가·게시 gate) | 없음 |
| 상품 등록/수정 진입 | 있음 (`/admin/template-products/[id]`로 이동) | 없음 |
| 작가 연결 표시 | 있음 | 없음 |
| 템플릿 생성 | legacy 엔진 생성 모달 | studio 엔진 생성 페이지 (`/create`) |
| 내용 편집 | 엔진별 분기 (studio → Studio 에디터, legacy → `/time-table/[id]`) | Studio 에디터 |
| 삭제 | 없음 | 있음 (studio 템플릿만) |
| 비주얼 시스템 | 구형 | 신형 (d47f0102에서 공용 admin 비주얼로 정비) |

### 검토 중 확인된 중요 사실

1. **상품 폼은 이미 독립 페이지로 분리되어 있다.**
   README 로드맵 4단계는 "`TemplateManagement.tsx`의 상품 생성 로직을 공용
   컴포넌트로 분리"를 중간~높은 난이도로 예상했지만, 실제로는
   `handleCreateProduct`/`handleEditProduct`가 이미
   `/admin/template-products/[templateId]` **독립 라우트 페이지**로 이동한다
   (`TemplateManagement.tsx:556-564`). 이 페이지는 상품 정보, PRO 플랜 가격,
   작가 연결, 로열티 규칙까지 포함한 완결형 화면이고 엔진에 의존하지 않는다.
   따라서 Studio에서 상품 관리로 가는 길은 **링크 하나 추가**로 끝난다 —
   로드맵 1단계와 4단계가 사실상 같은 작업으로 합쳐진다.

2. **구 목록이 오히려 "통합 목록"의 형태에 더 가깝다.**
   구 Templates 탭은 이미 엔진을 인식한다: Legacy/Studio 배지를 표시하고,
   행 클릭 시 studio 행은 Studio 에디터로, legacy 행은 `/time-table/[id]`로
   분기한다(`TemplateManagement.tsx:470-477`). 반면 신 Studio 목록은 studio
   엔진 전용이며 판매·공개 정보가 전혀 없다. 즉 "무엇을 남길까"의 답은
   화면의 신구가 아니라 **데이터 범위**로 판단해야 한다.

3. **판매 gate 로직은 구 화면에만 있다.**
   판매 시작 시 "작가 연결 필수 + `status === published` 필수" 검증이
   `toggleShopVisibility`(`TemplateManagement.tsx:567-601`)에 구현되어 있다.
   통합 시 이 도메인 규칙이 유실되지 않도록 이식 대상으로 명시해야 한다.

4. **Studio 목록 API는 판매 관련 컬럼을 조회하지 않는다.**
   `listTemplateStudioTemplates`의 select는
   `id, name, description, status, created_by, created_at, updated_at`뿐이다
   (`templateStudioPersistenceService.ts:258`). 배지 노출을 위해서는 select
   확장 또는 기존 `/api/admin/templates` 재사용이 필요하다.

5. **접근 권한 관리는 이미 통합 완료다.**
   "접근 권한 관리" 탭(`AccessManagement.tsx`)은 엔진 구분 없이 동작하므로
   이번 통합 범위에서 제외한다.

## 통합 방향 후보

### 방향 A — 역할 분리 유지 + 상호 딥링크

Templates 탭 = 카탈로그·판매 관리, Studio 탭 = 제작 도구로 역할을 나누고
서로 링크만 연결한다.

- 장점: 변경 최소. README 로드맵 1~2단계와 동일.
- 단점: 같은 템플릿이 계속 두 목록에 노출된다. "어디서 무엇을 하는가"를
  운영자가 외워야 하는 구조가 고착된다. 탭이 2개인 근본 문제는 남는다.

### 방향 B — 구 Templates 목록을 단일 허브로 승격

Studio 탭의 목록 페이지를 없애고 Studio는 생성/편집/미리보기 라우트만
남긴다. 진입은 Templates 목록의 행/버튼에서.

- 장점: 구 목록이 이미 전 엔진 + 검색 + 페이지네이션 + 판매 관리를 갖추고
  있어 추가 개발이 거의 없다.
- 단점: 2,000줄 모놀리스와 구형 비주얼이 표준으로 고착된다. 방금
  공용 admin 비주얼 시스템으로 정비한 Studio 목록(d47f0102)을 버리게 된다.
  장기적으로 리팩터링 부채가 그대로 남는다.

### 방향 C — 신규 통합 목록으로 수렴 (권장)

Studio 목록의 신형 비주얼·컴포넌트 구조를 기반으로 하되, 데이터 소스를
기존 `/api/admin/templates`(전 엔진, 검색·페이지네이션·shop/plans/artists
조인 완비)로 바꾼 **단일 "템플릿 관리" 목록**을 만들고, 구 Templates 탭과
Studio 전용 목록을 모두 이 화면으로 대체한다.

- 장점: 목록이 하나가 된다. 신형 비주얼 시스템 유지. API는 기존 것을
  그대로 재사용하므로 서버 변경이 거의 없다. 모놀리스는 자연 폐기된다.
- 단점: 목록 화면 신규 작성 비용(다만 Studio 목록 컴포넌트를 확장하는
  형태라 밑그림은 이미 있다). 전환기 동안 기능 누락 리스크.

## 권장안: 방향 C를 목표로 한 단계적 수렴

한 번에 갈아끼우지 않고, README 로드맵과 정합되도록 아래 순서로 진행한다.
1~2단계는 방향 A와 동일한 작업이므로 A를 거쳐 C로 가는 경로이며, 중간에
멈추더라도 각 단계가 그 자체로 개선이다.

### 1단계 — Studio 목록에 판매 상태 노출 + 상품 관리 딥링크 (README 1·2단계 통합)

- `listTemplateStudioTemplates` select에 `is_public`과 `shop_templates`
  (`id`, `is_shop_visible`) 조인을 추가하고, 목록에 공개/판매 배지를 표시.
- 행 액션에 "상점 정보" 버튼 추가 → `/admin/template-products/[templateId]`.
  상품 폼이 이미 독립 페이지이므로 이 링크만으로 공개 템플릿 3~4단계 흐름이
  Studio에서 재현 가능해진다.
- 리스크 낮음. 즉시 배포 가능.

### 2단계 — 판매 시작/중지 토글 이식 (README 3단계)

- `toggleShopVisibility`의 로직(작가 연결 gate, `published` gate 포함)을
  훅 또는 공용 유틸로 추출해 Studio 목록 행 액션에 추가.
- API는 기존 `PUT /api/admin/shop-templates/[id]` 계열을 그대로 사용.

### 3단계 — 통합 목록으로 전환

- Studio 목록 컴포넌트(`template-studio-admin-list-client.tsx`)를 확장해
  데이터 소스를 `useAdminTemplates`(기존 `/api/admin/templates`)로 교체.
  전 엔진 표시, 검색, 페이지네이션, 공개/비공개 필터를 흡수.
- 행 액션을 엔진별로 분기:
  - `studio`: Studio 에디터 편집 / 미리보기 / 삭제
  - `legacy`: `/time-table/[id]` 실행 링크 (편집 액션 없음, 조회 전용)
  - 공통: 상점 정보, 판매 시작/중지, ID 복사
- "새 템플릿" 버튼은 Studio 생성(`/admin/template-studio/create`)으로
  단일화. legacy 엔진 신규 생성 모달은 이 시점에 폐기한다
  (신규 제작은 Studio로만 한다는 전제 — 아래 "결정 필요" 참고).
- 사이드바에서 "Templates" 탭 제거, "Template Studio" 탭을 "템플릿 관리"로
  개칭(또는 그 반대 — 세그먼트 URL 유지 관점에서 결정). 제거되는 세그먼트는
  `adminTabs.ts`에서 남는 탭으로 redirect 처리해 북마크를 보존한다.
- `TemplateManagement.tsx`는 이 단계 완료 후 삭제.

### 4단계 — "게시 vs 판매 개시" 정책 정리 (README 5단계)

- 3단계까지는 `status`(콘텐츠 게시)와 `is_shop_visible`(판매 노출)을 현행
  분리 상태로 유지한다. 통합 목록이 안정된 뒤, 판매 개시를 단일 마법사로
  묶을지(게시 → 상품 확인 → 판매 시작) 제품 차원에서 결정하고 반영한다.

## 단계별 결정 필요 사항

| 결정 사항 | 시점 | 비고 |
| --- | --- | --- |
| legacy 엔진 신규 생성을 계속 허용할지 | 3단계 전 | 허용해야 한다면 통합 목록의 생성 버튼을 엔진 선택형으로 |
| 통합 목록에서 legacy 템플릿 삭제를 지원할지 | 3단계 | 현재 삭제는 studio 전용 API만 존재. legacy 삭제는 판매·권한 이력과 얽히므로 기본은 미지원 권장 |
| 남길 URL 세그먼트 (`/admin/templates` vs `/admin/template-studio`) | 3단계 | 어느 쪽이든 반대편은 redirect |
| `is_public`(상품 분류) 변경 UI 위치 | 3단계 | 현재 생성 모달에만 존재. 상품 상세 페이지(`template-products`)로 이동하는 것이 의미상 자연스러움 |
| 게시·판매 마법사 통합 여부 | 4단계 | 정책 결정, [통합 개발 개요](../template-system-integration/README.md)의 데이터 의미 정의를 전제로 |

## 통합 범위에서 제외하는 것

- **접근 권한 관리 탭**: 이미 엔진 통합 완료, 변경 불필요.
- **`/admin/template-products/[templateId]`**: 독립 페이지로 유지. 양쪽
  어디서든 링크로 진입하는 공용 화면이므로 통합의 수혜자이지 대상이 아니다.
- **팀 템플릿 관리(`TeamTemplateManagement.tsx`)**: 별도 도메인, 이번 검토
  범위 밖.
- **구매된 Studio 템플릿의 결제·내보내기 런타임 검증**: README와 동일하게
  별도 확인 필요.
