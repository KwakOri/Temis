# 04. 비활성 미리보기 링크의 키보드 접근 차단

- 우선순위: P2
- 상태: 완료 (2026-07-16)
- 영향 영역: Studio draft·archived 행의 미리보기 액션

## 문제

Studio 템플릿이 `published`가 아니면 미리보기 링크에 다음 처리를 한다.

- `aria-disabled=true`
- `pointer-events-none`
- 비활성 색상

하지만 요소는 여전히 `href`를 가진 `<a>`다. `pointer-events-none`은 포인터 입력만
막고 키보드 포커스와 Enter 활성화는 막지 않는다. `aria-disabled`도 보조기기에
상태를 전달할 뿐 브라우저 동작을 자동 차단하지 않는다.

따라서 마우스 사용자에게는 비활성으로 보이지만 키보드 사용자는 미리보기 route로
진입할 수 있다.

## 수정 방향

활성·비활성 상태에 따라 실제 요소를 분리한다.

- 활성: 현재처럼 Next.js `Link` 사용
- 비활성: `href`가 없는 `<span>` 또는 `disabled` 속성을 가진 `<button>` 사용

비활성 요소에는 다음 정보를 제공한다.

- 눈에 보이는 비활성 스타일
- 비활성 이유를 설명하는 텍스트 또는 접근 가능한 설명
- 포커스가 불필요하면 tab 순서에서 제외
- 포커스를 유지해 이유를 안내하려면 `button disabled` 대신
  `aria-disabled`와 이벤트 차단을 명시적으로 함께 구현

현재 상품 등록 차단 액션이 비활성 `<span>`으로 렌더링되는 패턴과 일관되게 맞출
수 있다.

## 완료 조건

- draft·archived Studio 행에서 미리보기 URL로 이동할 수 없다.
- 마우스 클릭, Tab/Enter, Space 모두 동일한 결과를 낸다.
- 보조기기가 비활성 상태와 이유를 인식할 수 있다.
- published Studio 행의 미리보기 링크는 정상 동작한다.
- 데스크톱 테이블과 모바일 카드에서 동작이 같다.

## 검증

- 브라우저에서 키보드만 사용해 전체 행 액션을 순회한다.
- draft, archived, published 표본을 각각 확인한다.
- DOM에서 비활성 요소에 `href`가 없음을 확인한다.
- axe 등 접근성 검사 도구가 연결된 환경에서는 링크·버튼 규칙 위반이 없는지
  추가 확인한다.

## 완료 근거 (2026-07-16)

- `src/components/admin/template-hub/template-hub-row-actions.tsx`와
  `src/app/(root)/admin/template-studio/_components/template-studio-admin-list-client.tsx`
  두 곳의 미리보기 액션을 상태에 따라 서로 다른 요소로 분기하도록 고쳤다.
  - published: 기존과 동일하게 `href`가 있는 Next.js `Link`.
  - draft/archived: `href`가 없는 `<span>`. `pointer-events-none` +
    `aria-disabled` 조합을 제거하고, 이미 코드베이스에 있던 "상품 등록 차단"
    비활성 `<span>` 패턴(`template-hub-row-actions.tsx`의 `productLinkBlocked`)과
    동일한 스타일·구조로 맞췄다. `title`로 비활성 이유("게시된 템플릿만
    미리볼 수 있습니다.")를 노출한다.
- 로컬 dev 서버(`npm run dev`, 별도 포트로 임시 기동)에서 draft 1건 +
  published 1건 Studio 템플릿을 만들어 Playwright로 실제 브라우저 검증을
  했다.
  - DOM 확인: published는 `<a href="...">`(tabIndex 0), draft는
    `<span>`(href 없음, tabIndex -1, title 있음) — `/admin/template-hub`와
    `/admin/template-studio` 양쪽 모두, 데스크톱 테이블·모바일 카드 마크업
    모두에서 동일하게 확인.
  - 키보드 Tab 순회: draft 행에서는 "수정" 다음 바로 "삭제"로 포커스가
    넘어가 "미리보기"가 tab 순서에서 완전히 빠짐을 확인. published 행에서는
    "미리보기"가 정상적으로 포커스를 받고 올바른 `href`를 가짐을 확인.
  - 마우스 강제 클릭(`force: true`)으로 draft 행의 비활성 `span`을 클릭해도
    URL이 바뀌지 않음을 확인(애초에 `href`도 클릭 핸들러도 없어 Enter/Space
    를 눌러도 동일하게 아무 일도 일어나지 않는다).
  - 테스트에 사용한 synthetic 템플릿과 임시 dev 서버는 검증 후 모두
    정리했다.
- `npx tsc --noEmit --pretty false --incremental false`, 변경 파일 ESLint
  모두 통과. 기존 `npm run check:template-hub:api` 회귀(30건)도 그대로
  통과해 다른 Hub 동작에 영향이 없음을 확인했다.
- 기존 관리 탭 코드(그 외 부분)와 원격 Supabase는 변경하지 않았다.
