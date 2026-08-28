# Phase 7. 운영 테스트 후 개선 계획

상태: 구현 예정
작성일: 2026-08-29
대상: 마이페이지, 사용자 Thumbnail Editor, 관리자 Thumbnail Studio, 관리자 썸네일 주문 상세

## 1. 결론

운영 테스트에서 확인한 항목은 대부분 실제 코드·데이터 상태와 일치한다. 다만 원인은
다음처럼 구분해야 한다.

- 마이페이지 대표 이미지 기능은 이미 있지만, 원격의 게시된 Studio 썸네일 3개 모두
  `templates.thumbnail_url`이 비어 있어 placeholder만 표시된다.
- 사용자 화면의 `내용 입력`은 더미 데이터가 아니라 런타임 입력 패널의 고정 제목이며,
  사용자 입력에 필요하지 않으므로 제목과 그로 인한 여백을 제거한다.
- 저장 성공·실패는 상단의 짧은 상태 문구로만 표시되고, 명확한 진행 모달과 토스트는 없다.
- Bound 텍스트에서도 `Text > Content`가 계속 보이고, 값을 바꾸면
  `setStaticText()`가 호출되어 실제로 Static binding으로 전환된다.
- text input 생성 시 안내 문구가 `placeholder`와 `defaultValue` 양쪽에 동시에 저장된다.
  원격의 세 게시 템플릿도 모두 이 상태다.
- `template_access` 자체는 `(template_id, user_id)` 기준 다대다 구조지만,
  주문 완료 RPC가 다른 사용자의 기존 권한을 검사해 한 템플릿을 한 고객에게만
  부여하도록 막고 있다.

우선순위는 주문 권한 정합성(P0) → input/binding 의미 보정(P1) → 대표 이미지 운영
보완(P1) → 저장 피드백(P2) 순서로 잡는다. 주문의 진행 상태와 템플릿 권한 부여는
서로 독립된 상태로 관리하고, 진행 상태를 바꿔도 이미 부여한 권한을 자동 회수하지
않는다.

## 2. 검토 근거와 한계

### 2.1 코드 근거

- 마이페이지 카드: `src/components/my-page/user-template-section.tsx`
- 대표 이미지 resolver: `src/utils/templates/consumer-template.ts`
- 대표 이미지 렌더러: `src/components/templates/template-cover.tsx`
- 사용자 입력 패널 제목: `src/app/(root)/thumbnail/_components/thumbnail-runtime-form.tsx`
- Binding/Text Inspector: `src/app/(root)/admin/thumbnail-studio/_components/thumbnail-inspector.tsx`
- Inputs 패널: `src/app/(root)/admin/thumbnail-studio/_components/thumbnail-layer-tabs.tsx`
- 썸네일 input 생성·binding 명령:
  `src/utils/thumbnail-studio/input-commands.ts`,
  `src/utils/thumbnail-studio/binding-commands.ts`
- runtime 기본값과 binding 해석:
  `src/utils/template-studio/input-values.ts`,
  `src/utils/template-studio/binding-resolver.ts`
- 저장 흐름: `src/hooks/studio/use-studio-template-persistence.ts`
- 주문 상세: `src/components/admin/ThumbnailOrderDetailModal.tsx`
- 주문 완료 API/RPC:
  `src/app/api/admin/custom-orders/thumbnail/[id]/complete/route.ts`,
  `supabase/migrations/20260807010000_create_custom_thumbnail_orders.sql`

### 2.2 원격 DB 읽기 전용 점검

2026-08-29 기준:

- 게시된 Studio 썸네일 템플릿 3개
  - `루센트 썸네일` (`cc9d0c48-bb1f-4354-8fc5-7ce252bc668d`)
  - `메에님 썸네일` (`bd209147-64a9-40f0-a2bd-ff6dd9b51969`)
  - `운비님 썸네일` (`fb08ffad-1f92-41c9-9733-6ad7920c41d8`)
- 위 3개 모두 `thumbnail_url`이 비어 있다.
- 위 3개의 일반 text input 6개 모두 안내 문구가 `placeholder`와
  `defaultValue`에 동일하게 저장되어 있고 runtime global 값에도 들어 있다.
- 완료 주문은 3건이다. 그중 주문
  `f26fda08-21ae-44ee-86c6-b0ec487b5589`는 완료 상태지만 대응하는
  `(template_id, user_id)` 권한 행이 없다.
- 동일한 `메에님 썸네일`을 사용자 5와 211의 완료 주문이 함께 참조하지만 실제
  권한은 사용자 211에게만 존재한다.

기존 동작에서는 완료와 권한 부여가 한 작업이었으므로 위 한 건은 정합성 문제다.
그러나 새 모델에서는 주문 상태 `completed`와 권한 부여 여부가 독립적이므로, 과거
완료 상태만 보고 권한을 자동 생성할 수 없다. 기존 접근 권한이 확인되는 주문만 권한
부여 이력을 backfill하고, 매칭되지 않는 주문은 `권한 미부여` 상태로 남겨 운영자가
실제 권한을 부여할지 판단한다. 주문 상태를 자동으로 되돌리지도 않는다.

### 2.3 화면 검토 한계

로컬 앱의 인증 전 화면까지는 확인했지만 대상 화면은 로그인 뒤에 있어 현재 세션에서
직접 캡처하지 못했다. 아래 UX 판단은 사용자가 제공한 테스트 결과와 현재 코드·원격
데이터를 함께 대조한 결과다. 구현 검증 단계에서는 관리자와 일반 사용자 계정으로
각 화면을 다시 실측한다.

## 3. 항목별 판단

| 영역                             | 판단                    | 원인                                                                | 우선순위 |
| -------------------------------- | ----------------------- | ------------------------------------------------------------------- | -------- |
| 마이페이지 대표 이미지           | 재현 가능               | 렌더·fallback 로직은 있으나 원격 `thumbnail_url` 3건 모두 비어 있음 | P1       |
| `내용 입력` 문구                 | 제거 대상               | 데이터가 아닌 고정 섹션 제목이며 해당 위치에 제목이 불필요함        | P3       |
| 저장 피드백                      | 개선 필요               | mutation pending으로 버튼만 막고 결과를 짧은 상태 문구로만 표시     | P2       |
| Bound 상태의 Content             | 명확한 결함             | binding 종류와 무관하게 Content를 렌더하고 `setStaticText()` 호출   | P1       |
| Inputs 접기                      | 개선 필요               | 모든 input의 전체 설정이 항상 펼쳐짐                                | P2       |
| Bound에서 label/placeholder 편집 | 개선 필요               | 현재는 정보 카드와 `Open in Inputs` 링크만 제공                     | P1       |
| placeholder/default 분리         | 명확한 데이터·동작 결함 | 생성 명령과 저장 데이터가 두 값을 동일하게 취급                     | P1       |
| 한 템플릿 다중 사용자 권한       | 명확한 서버 결함        | 완료 RPC의 다른 사용자 권한 존재 검사                               | P0       |
| 주문에서 템플릿 카드 선택        | 개선 필요               | UUID 직접 입력만 제공                                               | P1       |
| 주문 상태·권한 부여 분리         | 구조 개선 필요          | 완료 상태와 권한 부여가 한 동작으로 결합되고 완료 후 상태가 잠김    | P0       |

## 4. 목표 계약

### 4.1 text input 값의 의미

| 값             | 저장 의미               | form 표시        | canvas preview                     |
| -------------- | ----------------------- | ---------------- | ---------------------------------- |
| `defaultValue` | 실제 초기 사용자 값     | input의 `value`  | 실제 값으로 표시                   |
| `placeholder`  | 입력 안내 문구          | HTML placeholder | 실제 값이 비어 있을 때 안내용 표시 |
| runtime value  | 현재 사용자가 입력한 값 | input의 `value`  | 가장 높은 우선순위로 표시          |

표시 우선순위는 `runtime value → defaultValue → placeholder → 빈 문자열`로 한다.
단, placeholder를 사용해 표시하더라도 runtime 값은 빈 문자열로 유지한다. 필수 입력
검증도 placeholder가 아니라 실제 runtime 값을 기준으로 한다.

현재 사용자 preview와 PNG는 같은 `StudioExportRoot`를 사용하므로 WYSIWYG 원칙을
유지한다. 즉 화면에 보이는 placeholder fallback도 PNG에 보인다. 필수 input이 비어
있으면 placeholder가 보이더라도 내보내기를 막아 안내 문구를 실제 콘텐츠로 오인해
내려받는 일을 방지한다.

### 4.2 Binding Inspector

- Static text node: Binding의 Static text와 Text의 Content 중 한 곳만 편집 지점으로
  남긴다. 중복 필드는 제거하거나 한쪽을 읽기 전용으로 만든다.
- Bound text node: `Text > Content`를 렌더하지 않는다.
- Bound text input: Binding 안에서 `label`, `placeholder`를 바로 편집한다.
- Bound image/select input: `label`만 노출한다. 타입별 고정 정책은 schema에는
  유지하되 일반 편집 UI에서는 숨긴다.
- `Open in Inputs`는 제거한다. Inputs 탭은 input 추가·순서·복제·삭제·preview 확인을
  위한 목록 관리 화면으로 제한한다.
- 모든 변경은 기존 `applyThumbnailStudioUpdateInput()` 명령을 통과시켜 undo/redo와
  preview 동기화를 유지한다.

### 4.3 주문과 권한

`template_access`의 유일성은 계속 `(template_id, user_id)`로 유지한다. 한 템플릿에
여러 사용자가 각각 권한을 가질 수 있고, 같은 사용자에게 같은 템플릿 권한을 중복
생성하지 않는다.

주문의 진행 상태와 템플릿 권한 부여 여부는 서로 다른 상태로 취급한다.

- 주문 상태: `pending`, `accepted`, `in_progress`, `completed`, `cancelled`
- 권한 상태: 주문별 활성 권한 부여 이력의 존재 여부로 판단

```text
상태 버튼 선택
    → 주문 상태만 변경
    → 기존 템플릿 권한과 권한 부여 이력은 변경하지 않음

비공개·게시된 Studio thumbnail 선택 후 권한 부여 및 완료
    → (template_id, user_id) 접근 권한 upsert
    → 주문별 권한 부여 이력 생성
    → 주문 상태를 completed로 변경

completed 주문을 pending 등으로 변경
    → 주문 상태만 변경
    → 이미 부여한 권한과 선택 템플릿은 유지
```

`완료 버튼을 눌렀는가`라는 boolean이나 현재 주문 상태로 권한 부여 여부를 추정하지
않는다. 주문별 권한 부여 이력을 source of truth로 사용한다. 다른 사용자에게 같은
템플릿 권한이 있다는 이유로 부여를 막지 않는다.

상태가 `completed`여도 권한 이력이 없으면 템플릿 선택과 권한 부여 액션을 표시한다.
반대로 상태가 `pending`, `in_progress`, `cancelled`여도 권한 이력이 있으면 기존 권한은
유지하고 부여된 템플릿을 읽기 전용 카드로 표시한다. 추가 제공이 필요한 경우에만
명시적인 `템플릿 추가 부여` 액션으로 선택 UI를 다시 연다.

잘못 부여한 권한은 상태 변경과 연결하지 않고 별도의 `권한 회수` 액션으로 처리한다.
회수 시에는 같은 사용자·템플릿에 대한 다른 활성 부여 이력이 있는지 확인한 뒤 실제
`template_access` 삭제 여부를 결정한다. 다른 주문이나 다른 사용자의 권한은 건드리지
않는다.

## 5. 구현 계획

### 5.1 P0 — 주문 상태와 권한 부여 이력 분리

1. 새 migration에서 주문별 권한 부여 이력 테이블을 추가한다.
   - 제안 이름: `custom_thumbnail_order_template_grants`
   - 필드: `order_id`, `template_id`, `user_id`, `granted_by`, `granted_at`,
     `revoked_by`, `revoked_at`
   - 같은 주문·템플릿의 활성 이력은 하나만 존재하도록 partial unique index를 둔다.
   - `template_access`는 실제 접근 가능 여부를 나타내고, grant 행은 어떤 주문에서
     언제 권한을 부여했는지 나타내는 source of truth로 사용한다.
2. 템플릿 권한 부여 RPC를 교체하거나 새로 추가한다.
   - `user_id <> v_order.user_id` 권한 존재 검사를 삭제한다.
   - 템플릿 종류·비공개·상점 미노출·게시 상태·게시 문서 존재 검증은 유지한다.
   - `(template_id, user_id)` 접근 권한 upsert, grant 이력 생성, 주문 상태
     `completed` 변경을 한 transaction으로 처리한다.
   - 동일한 활성 grant에 대한 재요청은 중복 권한이나 중복 이력을 만들지 않도록
     idempotent하게 처리한다.
3. 기존 `result_template_id`는 호환용 primary/최초 결과 포인터로만 유지한다.
   - 한 주문에 여러 템플릿을 부여할 수 있으므로 권한 판단과 화면 목록의 source of
     truth로 사용하지 않는다.
   - 실제 부여 목록과 시각은 grant 테이블에서 조회한다.
   - `completed_at`도 권한 부여 시각으로 사용하지 않고 grant의 `granted_at`을 사용한다.
4. 일반 상태 변경 API를 모든 상태 사이에서 사용할 수 있게 한다.
   - `pending`, `accepted`, `in_progress`, `completed`, `cancelled`를 자유롭게 선택한다.
   - 상태 변경은 grant 이력과 `template_access`를 생성·수정·삭제하지 않는다.
   - 상태를 직접 `completed`로 바꿔도 권한은 자동 부여되지 않는다.
5. 명시적인 권한 회수 RPC와 API를 추가한다.
   - 대상 grant만 `revoked_at`/`revoked_by`로 비활성화한다.
   - 같은 `(template_id, user_id)`에 다른 활성 grant가 없을 때만 실제
     `template_access`를 삭제한다.
   - 주문 상태와 다른 주문·사용자의 권한은 변경하지 않는다.
6. 관리자 주문 상세에서 주문 상태와 권한 상태를 분리해 표시한다.
   - 상태 버튼은 현재 상태를 제외하고 언제든 선택할 수 있다.
   - `주문 상태`와 `템플릿 권한` 배지를 별도로 표시한다.
   - 상태가 완료지만 grant가 없으면 `권한 미부여`와 선택 UI를 표시한다.
   - 상태가 완료가 아니지만 grant가 있으면 `권한 유지 중`과 부여된 템플릿을 표시한다.
   - 취소 주문에 활성 grant가 남아 있으면 `주문 취소 · 권한 유지 중`을 명확히 표시한다.

상태 변경은 확인 모달 없이 독립적으로 처리하되, 권한 없이 상태만 `completed`로
바꾸는 경우에는 `권한은 부여되지 않는다`는 설명을 인접 도움말이나 가벼운 확인으로
명확히 알린다. 자동 권한 회수나 결과 연결 초기화는 하지 않는다.

### 5.2 P1 — 주문 결과 템플릿 카드 선택

1. 주문 완료용 후보 API를 만든다.
   - 조건: `template_engine=studio`, `template_kind=thumbnail`, `is_public=false`,
     `is_shop_visible=false`, `status=published`, 게시 문서와 revision 존재.
   - 응답: id, 이름, 설명, catalog cover, 수정일, 기존 권한 사용자 수.
2. Page → React Query hook → service → API 구조를 유지한다.
3. UUID input을 카드형 단일 선택 목록으로 교체한다.
   - cover, 이름, 게시 상태, 수정일을 표시한다.
   - cover가 없으면 종류별 placeholder를 보여 주되 선택은 허용한다.
   - 카드 전체를 radio semantics로 만들고 키보드 선택과 focus ring을 제공한다.
4. 활성 grant가 하나도 없을 때는 기본 템플릿 선택 UI와
   `템플릿 권한 부여 및 완료` 액션을 표시한다.
   - 선택한 카드가 있어야 액션을 활성화한다.
   - 액션 성공 시 권한을 부여하고 주문 상태를 완료로 변경한다.
5. 활성 grant가 있으면 선택 UI를 자동으로 다시 열지 않는다.
   - 현재 주문 상태와 무관하게 이미 부여한 템플릿을 읽기 전용 카드 목록으로 보여 준다.
   - 별도의 `템플릿 추가 부여`를 누른 경우에만 후보 카드 선택 UI를 연다.
   - `템플릿 변경`이라는 표현은 기존 권한 제거로 오해할 수 있어 사용하지 않는다.
6. 각 부여 카드에는 부여 시각과 관리자를 표시하고, 권한 회수는 별도 메뉴와 확인
   절차로 제공한다. 권한 회수는 상태 변경 동작에 포함하지 않는다.
7. 서버는 클라이언트 후보 목록을 신뢰하지 않고 권한 부여 RPC에서 동일 조건을 다시
   검증한다.

기존 Template Studio 목록 API는 `thumbnail_url`, 공개 여부, 게시 문서 존재 여부가
없으므로 주문 화면에서 클라이언트 필터만 하지 않는다. 주문 완료 조건을 서버에서
보장하는 좁은 후보 API가 더 안전하다.

### 5.3 P1 — Bound와 Inputs 단순화

1. `buildThumbnailInspectorSections()`에서 binding 상태를 기준으로 Content를 조건부
   렌더한다.
   - `staticText`: Content 표시
   - `inputText`/`selectText`/`builtinField`: Content 숨김
2. Binding에 input 편집 callback을 추가하고 Bound 상태에서 label/placeholder를
   인라인으로 제공한다.
3. `ThumbnailStudioView`에 `collapsedInputIds`를 추가한다.
   - input 카드는 처음에 접힌 상태다.
   - 헤더에 label, type, consumer 수와 펼치기 버튼을 표시한다.
   - 버튼은 `aria-expanded`와 input 이름이 포함된 label을 가진다.
4. Inputs 탭에서 일반 운영에 필요 없는 필드를 숨긴다.
   - 숨김: description, help text, group, required, default, max length, min rows,
     multiline, image 세부 policy.
   - 유지: 추가, 순서, 복제, 삭제, 연결 수, preview value/reset.
   - 고정값은 schema와 command 기본값으로 유지해 과거 문서를 계속 읽는다.
5. input id, scope, type은 계속 UI에서 수정하지 못하게 한다.

### 5.4 P1 — placeholder/default 분리와 기존 데이터 보정

1. Thumbnail 전용 신규 text input은 `defaultValue=""`로 만든다. 공용
   `createStudioInputDefinition()`을 전역 변경해 시간표 동작을 깨지 않는다.
2. `Create input from current value`는 현재 텍스트를 `placeholder`에만 넣고
   `defaultValue`는 비운다.
3. Thumbnail renderer에만 빈 input의 placeholder 표시를 적용한다. Timetable Studio와
   static/select binding 의미는 바꾸지 않는다.
4. 필수 input이 빈 상태에서는 PNG 내보내기를 막고 어떤 input이 필요한지 표시한다.
5. 원격 데이터 보정은 별도 dry-run 스크립트로 한다.
   - 대상 템플릿 ID와 input ID를 명시적으로 allowlist한다.
   - `defaultValue === placeholder`인 대상만 default/runtime global 값을 비운다.
   - 실행 전/후 document hash와 변경 값을 출력하되 비밀정보는 출력하지 않는다.
   - 게시 revision 이력을 보존하도록 정상 publish transaction을 사용한다.
   - 원격 적용은 별도 승인 뒤 실행한다.

과거 revision 전체를 일괄 수정하지 않는다. 현재 게시 문서를 새 revision으로 보정하고
이전 revision은 감사 이력으로 유지한다.

### 5.5 P1 — 마이페이지 catalog cover

1. 단기 운영 보정으로 세 게시 썸네일의 catalog cover를 등록한다.
   - 기존 `POST /api/admin/templates/[id]/catalog-cover`와
     `templates.thumbnail_url` 계약을 재사용한다.
   - 사용자 PNG 결과와 catalog cover를 섞지 않는다.
2. Thumbnail Studio 목록에 `대표 이미지 없음` 상태와 `대표 이미지 생성/등록` 진입점을
   추가한다.
3. 발행 문서와 기본 runtime 값을 `StudioRenderer`로 렌더해 cover 후보를 만들고,
   관리자가 확인한 뒤 기존 catalog-cover 업로드 경로로 저장한다.
4. cover 생성 실패는 저장·발행을 실패시키지 않는다. 게시 성공 뒤 별도 경고와 재시도
   액션으로 처리한다.
5. 마이페이지는 기존 `thumbnail_url → 종류별 placeholder` resolver를 계속 사용한다.
   Studio 썸네일에 Legacy `/thumbnail/{id}.png` 경로를 추측하지 않는다.

### 5.6 P2 — 저장 진행 모달과 결과 토스트

1. `isRemoteSyncing` 하나 대신 사용자가 시작한 operation 상태를 둔다.
   - `validating`, `creating`, `syncing-assets`, `saving`, `publishing`, `previewing`
2. 저장·발행·draft preview 중에는 닫을 수 없는 로딩 모달을 표시한다.
   - 현재 단계 문구와 spinner
   - 배경 클릭/Escape로 닫지 않음
   - 저장·발행·preview 중복 실행 차단
3. 성공 시 성공 토스트, 실패 시 오류 토스트를 표시한다.
   - 성공: 저장/발행 결과와 revision 번호
   - 실패: 현재 `TemplateStudioApiError`의 첫 진단과 reference id 유지
   - `role=status`/`aria-live=polite`, 실패는 `role=alert`
4. 현재 상단 `statusMessage`는 최근 상태를 확인하는 보조 정보로 유지한다.
5. 새 토스트 의존성을 추가하지 않고 Studio 공용 경량 overlay/toast 컴포넌트를 만든다.

### 5.7 P3 — 사용자 런타임 제목 제거

`내용 입력` 고정 제목을 완전히 제거한다. 대체 문구는 넣지 않고, 제목 wrapper로 인해
남는 margin/padding도 함께 제거한다. 하단의 실제 동적 group/input label만 유지하며,
공용 `StudioRuntimeFormShell`을 사용한다면 썸네일 화면에서 제목을 생략할 수 있도록
optional contract로 변경해 다른 화면의 제목까지 제거하지 않는다.

## 6. 데이터 전환 순서

1. 로컬 DB에서 migration과 RPC 통합 테스트를 통과시킨다.
2. 원격 적용 전 `custom_thumbnail_orders`, `template_access`, 현재 Studio document를
   백업하고 완료 주문/권한 불일치 dry-run을 저장한다.
3. 다중 사용자 grant 이력과 권한 부여·회수 RPC migration을 먼저 배포한다.
4. 기존 주문 중 `(result_template_id, user_id)` 접근 권한이 실제로 존재하는 건만 활성
   grant 이력으로 backfill한다. 상태가 완료라는 이유만으로 접근 권한이나 grant를 만들지
   않는다.
5. 기존 완료 주문 중 접근 권한이 없는 한 건은 `완료 · 권한 미부여`로 유지하고,
   운영자가 실제 제공이 필요한 주문인지 확인한 뒤 새 권한 부여 액션을 실행한다.
   테스트 주문이어도 상태 변경만 수행하며 자동 권한 회수 로직은 사용하지 않는다.
6. 자유로운 상태 변경, 주문 후보 카드, 최초/추가 권한 부여, 명시적 권한 회수 UI를
   배포한다.
7. placeholder fallback 코드 배포 뒤 세 템플릿 데이터 보정 script를 dry-run한다.
8. 승인된 대상만 새 revision으로 publish한다.
9. catalog cover 3건을 생성·확인·등록한다.

앱 롤백이 필요하더라도 다중 사용자 권한을 다시 1대1로 제한하지 않는다. 이미 여러
사용자가 같은 템플릿을 받은 뒤 옛 RPC를 복구하면 신규 완료만 다시 실패하는 혼합
상태가 된다.

## 7. 검증 계획

### 7.1 자동 검증

- `npx tsc --noEmit`
- `npm run lint`
- `npm run check:thumbnail-studio:bindings`
- `npm run check:thumbnail-studio:input-commands`
- `npm run check:thumbnail-studio:input-order`
- `npm run check:thumbnail-studio:runtime`
- `npm run check:thumbnail-studio:editor`
- `npm run check:studio:input-inspector`
- `npm run check:user-template-ui:consumer`
- `npm run check:user-template-ui:my-page-browser`
- 주문 상태 변경/권한 부여/권한 회수 전용 DB·API check script 추가

### 7.2 필수 회귀 시나리오

1. 같은 썸네일 템플릿을 사용자 A와 B의 서로 다른 주문에서 권한 부여하면 사용자별
   접근 권한과 주문별 grant 이력이 생성된다.
2. 템플릿 권한 부여 액션은 권한·grant를 생성하고 주문 상태를 `completed`로 바꾼다.
3. 권한 부여 후 주문을 `pending`, `in_progress`, `cancelled`로 바꿔도 grant와 실제
   접근 권한은 유지된다.
4. 주문 상태를 직접 `completed`로 바꾸면 권한은 생기지 않고 화면에 `권한 미부여`가
   표시되며 템플릿 선택 액션은 계속 보인다.
5. 활성 grant가 있는 주문은 상태와 무관하게 기본 선택 UI를 숨기고 부여된 템플릿을
   읽기 전용으로 보여 준다. `템플릿 추가 부여`를 눌렀을 때만 선택 UI가 다시 열린다.
6. 같은 주문에 두 템플릿을 추가 부여하면 기존 권한을 유지한 채 grant가 하나씩
   기록된다.
7. 같은 사용자·템플릿에 다른 활성 grant가 있을 때 한 grant를 회수해도 실제 접근
   권한은 유지되고, 마지막 활성 grant를 회수할 때만 접근 권한이 삭제된다.
8. A의 grant를 회수해도 같은 템플릿에 대한 사용자 B의 권한은 유지된다.
9. 공개·상점 노출·미게시 템플릿은 후보에서 제외되고 RPC에서도 권한 부여가 거절된다.
10. 모든 상태 버튼으로 자유롭게 이동할 수 있고 상태 변경만으로 권한이나 grant가
    추가·회수되지 않는다.
11. Bound text에서는 Content가 보이지 않고 label/placeholder 수정 후에도 Bound가
    유지된다.
12. placeholder 수정 시 form 값은 빈 문자열이고 canvas에는 placeholder가 보인다.
13. 사용자가 입력하면 placeholder가 즉시 실제 값으로 교체된다.
14. 필수 input이 비어 있으면 PNG 저장이 차단된다.
15. 사용자 썸네일 화면에서 `내용 입력` 제목과 불필요한 상단 여백이 보이지 않는다.
16. 저장 중 모달이 표시되고 성공·실패에 맞는 토스트가 한 번만 표시된다.
17. 마이페이지의 세 썸네일 카드에 등록된 catalog cover가 표시되고 이미지 실패 시
    placeholder로 안전하게 돌아간다.

### 7.3 브라우저 실측

- 관리자: Thumbnail Studio 저장 성공/실패, Bound/Static 전환, Inputs 접기,
  주문 상태 자유 변경, 최초/추가 권한 부여, 명시적 권한 회수
- 일반 사용자: 마이페이지 cover, `/thumbnail/[templateId]` placeholder와 실제 입력,
  PNG 내보내기
- desktop과 mobile에서 카드 선택, 모달 focus, toast의 가림 여부 확인
- 관리자와 일반 사용자 계정을 분리해 상태 변경 시 접근이 유지되고, 마지막 활성
  grant를 명시적으로 회수한 뒤에만 접근이 거절되는지 확인

프로젝트 규칙에 따라 production build는 기본 검증에서 제외하고 lint, typecheck,
관련 check script와 브라우저 실측을 우선한다.

## 8. 완료 조건

- [ ] 한 게시 썸네일 템플릿을 여러 사용자에게 완료 처리할 수 있다.
- [ ] 주문 상태는 어느 상태로든 자유롭게 변경할 수 있고 기존 권한에 영향을 주지 않는다.
- [ ] 권한 부여 이력이 주문 상태와 독립적으로 저장되고 실제 `template_access`와 일치한다.
- [ ] 최초/추가 권한 부여와 명시적 권한 회수가 원자적이며 다른 주문·사용자 권한을
      건드리지 않는다.
- [ ] UUID를 직접 입력하지 않고 검증된 템플릿 카드로 완료 처리한다.
- [ ] grant 유무에 따라 템플릿 선택, 부여 완료 목록, 추가 부여 UI가 정확히 전환된다.
- [ ] 상태가 완료지만 권한이 없는 주문과 완료가 아니지만 권한이 있는 주문을 명확히
      구분해 표시한다.
- [ ] Bound text의 Content 입력이 사라지고 label/placeholder를 Binding에서 편집한다.
- [ ] text placeholder와 실제 default/runtime 값이 분리된다.
- [ ] input 카드가 접히고 일반 운영에 불필요한 설정이 숨겨진다.
- [ ] 사용자 썸네일 화면에서 `내용 입력` 제목과 해당 제목의 여백이 제거된다.
- [ ] 저장 중 모달과 성공·실패 토스트가 키보드·스크린 리더에서도 동작한다.
- [ ] 게시된 썸네일 템플릿 3개의 catalog cover가 마이페이지에 표시된다.
- [ ] 인증된 관리자·일반 사용자 브라우저 회귀를 모두 통과한다.
