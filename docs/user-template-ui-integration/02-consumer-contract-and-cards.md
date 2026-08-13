# 02. 사용자 템플릿 계약과 공용 카드

상태: 완료 (2026-08-05)  
선행 조건: 01단계 로컬 API 기준선 통과

## 1. 목표

마이페이지와 상점이 같은 템플릿 분류, 실행 링크, 대표 이미지 규칙을 사용하도록
소비자용 타입과 공용 표시 컴포넌트를 만든다.

## 2. 사용자 템플릿 모델

브라우저 UI가 필요로 하는 최소 계약을 명시적으로 정의한다.

```ts
type ConsumerTemplateKind = "timetable" | "thumbnail";
type ConsumerTemplateEngine = "legacy" | "studio";

interface ConsumerTemplateSummary {
  id: string; // canonical templates.id
  name: string;
  description: string;
  engine: ConsumerTemplateEngine;
  kind: ConsumerTemplateKind;
  salesType: "general" | "custom";
  accessSource: "purchase" | "artist" | null;
  plan: "lite" | "pro" | null;
  thumbnailUrl: string | null;
  coverUrl: string | null;
  useHref: string;
}
```

Legacy의 `template_kind=null`은 API 또는 service 정규화 경계에서 `timetable`로
변환한다. Page 컴포넌트에서 null 분기를 반복하지 않는다.

기존 DB Row는 `UserService` 경계에서 정규화하고, 카드 props에는 `ConsumerTemplateSummary`만 전달한다. 표시 규칙은 별도 pure 함수로 분리해 마이페이지와 상점이 서로 다르게 해석하지 않게 한다.

## 3. 대표 이미지 resolver

pure 함수 하나가 다음 우선순위를 적용한다.

```text
thumbnail_url 존재
→ 해당 URL

없음 + legacy timetable
→ /thumbnail/{id}.png

그 외
→ null (종류별 placeholder)
```

필수 동작:

- 빈 문자열을 유효한 URL로 취급하지 않는다.
- 이미지 로드 오류가 나면 같은 실패 URL을 반복 요청하지 않는다.
- Studio 템플릿에 레거시 정적 경로를 자동 적용하지 않는다.
- 외부 URL과 R2 URL 모두 `<img>`로 표시한다.

## 4. 공용 카드 책임

공용 카드 또는 공용 카드 primitive는 다음을 지원한다.

- 템플릿 이름과 설명
- 시간표/썸네일 badge
- 선택적 Legacy/Studio badge
- 일반 판매/맞춤 badge
- 구매 plan badge
- 구매/작가 등 권한 출처 표시
- 대표 이미지 또는 placeholder
- 종류별 CTA
  - 시간표: `시간표 만들기`
  - 썸네일: `썸네일 만들기`
- 키보드와 스크린리더 접근 가능한 링크 또는 버튼

카드 전체 `div onClick`만으로 탐색하지 않는다. 실제 링크 요소를 사용하고
focus ring과 명확한 accessible name을 제공한다.

## 5. 컴포넌트 경계

권장 구조:

```text
src/components/templates/consumer-template-card.tsx
src/components/templates/template-kind-badge.tsx
src/components/templates/template-cover.tsx
src/utils/templates/consumer-template.ts
```

구현 경계는 다음과 같이 확정했다.

```text
src/utils/templates/consumer-template.ts
src/components/templates/template-kind-badge.tsx
src/components/templates/template-cover.tsx
src/components/templates/consumer-template-card.tsx
```

공용 카드에는 마이페이지 탭 상태나 상점 구매 form 상태를 넣지 않는다.
variant가 필요하면 `cva`를 사용한다.

- `surface`: `myPage | shop`
- `kind`: `timetable | thumbnail`
- `state`: `available | purchased | pending`

## 6. 데이터 계층

- `/api/user/templates` 호출은 `UserService`에 유지한다.
- `useUserTemplates`가 목록 서버 상태를 소유한다.
- 카드 컴포넌트는 네트워크를 호출하지 않는다.
- 실행 URL은 API의 `use_href`를 사용한다.
- fallback URL은 service/normalizer에서만 만들고 UI에서는 만들지 않는다.

## 7. 검증 결과

순수 계약과 server-renderable 카드 검증은 `scripts/check-consumer-template-contract.tsx`에서
수행한다. 2026-08-05 기준 다음 항목이 통과했다.

- [x] Legacy `template_kind=null`이 `timetable`로 정규화·표시된다.
- [x] Studio 시간표와 Studio 썸네일의 kind와 CTA가 다르다.
- [x] `thumbnail_url`이 있으면 Legacy 정적 fallback보다 우선한다.
- [x] Studio 템플릿에는 Legacy 정적 경로를 자동 적용하지 않는다.
- [x] invalid engine/kind, `is_public`, `use_href` row가 fail-open되지 않고 제외된다.
- [x] 카드 링크의 href가 `useHref`와 일치한다.
- [x] 카드에 직접 `fetch`, `router`, `onClick`, route 재계산이 없다.
- [x] 이미지 오류 상태는 React state로 placeholder 전환을 처리한다.

다음 항목은 pure/SSR checker의 범위를 넘어 실제 브라우저에서 검증할 후속 항목이다.

- [ ] Enter 키와 키보드 focus로 실행할 수 있다.
- [ ] 이미지 로드 오류 뒤 실패 URL을 반복 요청하지 않는다.
- [ ] 모바일 폭에서 badge와 CTA가 겹치지 않는다.

## 8. 완료 조건

- [x] UI가 DB Row의 null·snake_case 의미를 직접 해석하지 않는다.
- [x] 대표 이미지 resolver가 `check:user-template-ui:consumer`에서 검증된다.
- [x] 세 템플릿 종류가 하나의 `ConsumerTemplateSummary` 카드 계약으로 표시된다.
- [x] 실행 href를 카드에서 재계산하지 않는다.
- [x] 이미지 오류가 React 바깥 DOM 조작 없이 처리된다.
- [x] 공용 카드가 직접 HTTP 요청을 만들지 않는다.

실제 마이페이지 연결, 브라우저 focus/image error/mobile layout 검증은 03단계와
07단계의 범위로 남긴다.

## 9. 03단계 연결 인터페이스와 잔여 위험

03단계 마이페이지 통합은 다음 경계를 사용한다.

- `useUserTemplates`가 반환하는 `UserTemplate.consumer`를 `ConsumerTemplateCard`의
  `template` prop으로 전달한다.
- `ConsumerTemplateSummary`의 `id`, `engine`, `kind`, `salesType`, `accessSource`,
  `plan`, `coverUrl`, `useHref`를 사용하고 raw `templates.*`나 snake_case 필드를
  다시 해석하지 않는다.
- 카드 실행 링크는 `template.useHref`를 그대로 사용한다. UI에서 Legacy/Studio
  route나 `/thumbnail/{id}.png`를 추론하지 않는다.
- `surface="myPage"`, `state`, `showEngineBadge`, `showAccessSource`를 이용해
  마이페이지 탭·상태 표시를 연결할 수 있다.

다음은 02단계에서 의도적으로 남긴 위험이다.

- 일반 Legacy `/time-table/{id}` dynamic route의 실제 존재·허용 범위는 아직
  확정하지 않았다. 03단계 또는 07단계 브라우저 검증 전에 일반 route를 구현하거나
  기존 UUID registry로 범위를 제한해야 한다.
- SSR checker는 이미지 `onError` 이벤트, 실제 키보드 focus, 모바일 레이아웃을
  실행하지 않는다. 해당 검증은 03단계/07단계에서 수행한다.
- 마이페이지 실제 연결, 상점 구매 mutation, 관리자 대표 이미지 업로드는 각각
  03~06단계 범위다.
