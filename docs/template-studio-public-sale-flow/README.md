# Template Studio 공개 템플릿 판매 흐름 점검 및 로드맵

최종 수정: 2026-07-16

## 배경

기존 템플릿 시스템의 절차:

**공개 템플릿**
1. 템플릿 메타데이터 생성
2. 템플릿 내용 편집 (기존에는 코드에서 직접 진행)
3. 상점 데이터 생성 및 업로드
4. 판매 개시

**비공개 템플릿**
1~2번은 동일
3. 주문자 본인에게 해당 템플릿의 권한 부여

새 관리자 화면 `Template Studio`(`/admin/template-studio`)에서 위 절차를
그대로 재현할 수 있는지 점검했다. 결론: **비공개 템플릿 흐름은 완전히
재현 가능하지만, 공개 템플릿의 3~4번은 API·UI 모두 존재하되 전부 레거시
"Templates" 관리 탭에만 붙어 있고 Template Studio 자체에는 연결되어 있지
않다.**

## API 준비 상태

| 단계 | 상태 | 위치 |
| --- | --- | --- |
| 1. 메타데이터 생성 | 구현됨 | `POST /api/admin/template-studio/templates` → `createTemplateStudioTemplate()`(`src/services/server/templateStudioPersistenceService.ts:475`). `templates` 테이블에 `template_engine: "studio"`, `status: "draft"`, **`is_public: false` 하드코딩**으로 insert |
| 2. 내용 편집 | 구현됨 | draft CRUD: `.../template-studio/templates/[id]/draft`. Studio 자체 "publish": `.../[id]/publish` → RPC `publish_template_studio_document`(마이그레이션 `20260715010000_add_template_engine_and_status.sql:140`) — **`status`만 `published`로 바꿀 뿐 `is_public`은 건드리지 않음** |
| 3. 상점 데이터 생성/업로드 | 구현됨, Template Studio 밖에 위치 | `/api/admin/shop-templates`, `/api/admin/template-products`, `/api/admin/template-plans` (레거시 관리 API). `templates.is_public === true`인 것만 대상으로 하는 gate 있음(`src/app/api/admin/shop-templates/route.ts:39-50`). 테이블이 통합되어 있어 Studio 템플릿도 이론상 처리 가능하나, Template Studio API에는 이 흐름으로 이어주는 엔드포인트가 없음 |
| 4. 판매 개시(`is_public` 토글) | 구현됨, 완전히 별개의 엔드포인트 | `PUT /api/admin/templates/[id]`(`src/app/api/admin/templates/[id]/route.ts:93-101`, `is_shop_visible`도 함께 처리). Studio의 publish(2번)와 무관하며 둘을 잇는 API 없음 |
| 5. 비공개 템플릿 권한 부여 | 완전 구현됨 | `/api/admin/template-access` → `TemplateAccessService.grantAccess`(`src/lib/templates.ts`), grant 이메일 발송까지 포함. `templates` 통합 스키마 덕분에 Studio 템플릿에도 동일하게 동작 |

## UI 준비 상태

| 단계 | 상태 | 위치 |
| --- | --- | --- |
| 1/2. 메타데이터/내용 편집 | 구현됨 | Studio 목록(`.../template-studio/page.tsx`), 생성(`/create`), 에디터(`[templateId]/edit`) 전부 존재. 에디터 내 "Publish database document" 액션 존재. 목록 화면은 수정/미리보기/삭제만 있고 **공개·상점 관련 조작 없음** |
| 3. 상점 데이터 생성/업로드 | 구현됨, Template Studio에서 접근 불가 | `TemplateManagement.tsx`(레거시 "Templates" 사이드바 탭)에만 상품 생성 폼 존재. 이 화면은 Studio 템플릿을 인식하고 클릭 시 Studio 에디터로 연결까지 되지만, **반대 방향(Studio → 상점 등록)으로 가는 진입점이 없음** |
| 4. 판매 개시 UI | 레거시 Templates 탭에만 존재 | 같은 `TemplateManagement.tsx` 모달의 `is_public` 체크박스. Studio 목록에는 공개/비공개 상태 표시 자체가 없음 |
| 5. 권한 부여 UI | 완전 구현됨 | "접근 권한 관리" 탭(`AccessManagement.tsx`) — Studio 템플릿도 노출되고 사용자 검색·부여·해제 전부 동작 |

## 검토한 변경 방향

- **A. 링크만 연결**: Studio 화면에 레거시 상점 관리 페이지로 가는 버튼만 추가. 변경 최소, 즉시 배포 가능하지만 화면을 오가야 함.
- **B. 상태만 노출**: Studio 목록에 `is_public`/상점 등록 여부 배지만 표시. 실제 조작은 여전히 레거시에서.
- **C. 기존 API를 Studio UI로 재배선**: 새 API 없이 기존 `/api/admin/templates/[id]`, `/api/admin/shop-templates` 등을 Studio 화면에서 호출하도록 폼만 이식.
- **D. Studio "게시" 개념 재정의**: 지금 분리된 `status`(콘텐츠)와 `is_public`(판매)의 관계를 제품적으로 다시 정의.
- **E. 레거시 Templates 탭 단계적 폐기**: Studio가 유일한 진입점이 되도록 레거시 편집 기능을 걷어냄.

풀 리라이트(D+E 동시 진행)는 리스크가 크고, 링크만 붙이는 A는 근본 해결이 아니므로 아래처럼 단계적 진행을 권장한다.

## 권장 로드맵 (추천 순서)

1. **Studio → 레거시 상점 관리 딥링크 추가** (낮은 리스크, 반나절 이내)
   Studio 목록/에디터에 "상점 정보 관리" 버튼을 추가해 `/admin/template-products/[templateId]`로 이동. 진입점이 없어 재현 자체가 안 되던 상태를 즉시 해소.

2. **Studio 목록에 공개/판매 상태 노출** (낮은 리스크)
   `is_public`, `is_shop_visible`, 상점 상품 존재 여부를 목록 API 응답에 포함해 배지로 표시. 새 API 불필요.

3. **판매 개시 토글을 Studio 화면으로 이식** (중간 난이도)
   기존 `PUT /api/admin/templates/[id]`를 그대로 재사용하고 호출 UI만 Studio로 이전. 공개 템플릿 4번이 Studio 안에서 완결.

4. **상점 데이터 생성 폼을 Studio 안으로 이식** (중간~높은 난이도)
   `TemplateManagement.tsx`의 상품 생성 로직을 공용 컴포넌트로 분리해 Studio 에디터에 "상점 정보" 탭으로 추가. 기존 API 그대로 사용. 공개 템플릿 1~4번이 전부 Studio 안에서 완결.

5. **"게시" 개념 정리** (제품 결정 필요)
   콘텐츠 `status` publish와 판매 `is_public` 토글을 그대로 분리 유지할지, 하나의 "판매 개시" 마법사로 묶을지 결정. 코드보다 정책 문제이므로 3~4단계 UI에 반영하기 전에 방향을 먼저 정한다.

6. **레거시 Templates 탭 정리** (장기, 선택적)
   Studio가 공개/비공개 흐름을 모두 커버하게 되면, 같은 템플릿을 두 곳에서 편집 가능한 중복 상태를 없애기 위해 레거시 탭에서 Studio-engine 템플릿의 편집 기능을 숨기거나 순수 조회용 카탈로그로 전환.

## 참고

- 구·신 관리화면(Templates 탭 ↔ Template Studio)의 통합 방향 검토는
  [`admin-consolidation-direction.md`](./admin-consolidation-direction.md)에
  정리했다. 이 로드맵의 1·2·4단계에 영향을 주는 코드 현황 변화(상품 폼의
  독립 페이지 분리 등)도 해당 문서에 반영되어 있다.
- 구매된 Studio 엔진 상점 템플릿이 실제 결제/내보내기 런타임에서 정상 렌더링되는지는 이번 점검 범위 밖이며 별도 확인이 필요하다.
- 관련 통합 작업 이력은 [`docs/template-system-integration/`](../template-system-integration/README.md)에 정리되어 있다.
