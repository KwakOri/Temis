# 06. 일반 도메인 en/ja 다국어 개발 계획

## 1. 목적

일반 도메인 소비자 페이지의 `ko`/`en`/`ja` 다국어 지원을 구현한다.

이 계획의 선정 기준은 **다른 진행 작업과의 충돌 위험**이다. 제품 우선순위나
사용자 영향도가 아니다. Template Studio 계열 작업이 진행 중이므로 그 작업과
파일이 겹치지 않는 영역을 먼저 개발한다.

### 1.1 이 계획이 정하지 않는 것

- `/en`, `/ja`를 **언제 공개할지**. 공개 판단은 템플릿 UI 번역 상태까지 함께
  봐야 하므로 이 문서 범위 밖이다
  ([05 §11](./05-quality-rollout-and-operations.md#11-단계별-gono-go)).
- 템플릿 UI(Legacy·Studio)의 번역 방식. 04 Phase 3의 범위이며 유지된다.
- 관리자 화면 번역. 계획 전체에서 비목표다.

즉 이 문서는 "일반 도메인만 공개한다"가 아니라 "일반 도메인부터 개발한다"는
실행 계획이다. 공개 게이트는 나중에 별도로 정한다.

## 2. 범위

### 2.1 대상 라우트 (15 page + 3 layout)

```text
src/app/(root)/page.tsx                      랜딩
src/app/(root)/auth/page.tsx                 로그인
src/app/(root)/auth/signup/page.tsx          회원가입
src/app/(root)/auth/reset-password/page.tsx  비밀번호 재설정
src/app/(root)/auth/verify/page.tsx          이메일 인증
src/app/(root)/shop/page.tsx                 상점 목록
src/app/(root)/shop/[id]/page.tsx            상점 상세·구매 신청
src/app/(root)/shop/preview/page.tsx         상점 미리보기
src/app/(root)/my-page/page.tsx              마이페이지
src/app/(root)/portfolio/page.tsx            포트폴리오 목록
src/app/(root)/portfolio/[id]/page.tsx       포트폴리오 상세
src/app/(root)/custom-order/page.tsx         맞춤 주문
src/app/(root)/custom-order/layout.tsx       맞춤 주문 게이트
src/app/(root)/work-schedule/page.tsx        작업 일정
src/app/(root)/mobile-install/page.tsx       PWA 설치 안내
src/app/(root)/access-denied/page.tsx        접근 거부
src/app/(root)/layout.tsx                    (분리 대상, §5 참조)
src/app/layout.tsx                           (최소 변경, §4.2 참조)
```

### 2.2 대상 컴포넌트·로직

```text
src/components/LandingPage/**
src/components/shop/**
src/components/my-page/**
src/components/mobile/**
src/components/BackButton.tsx
src/components/Loading/**
src/components/UI/**              (일반 도메인에서 쓰이는 것만)
src/services/**                   (일반 도메인 서비스)
src/hooks/query/**                (일반 도메인 훅)
src/app/api/**                    (admin 제외, 일반 도메인이 쓰는 route)
```

### 2.3 명시적 제외

충돌 회피가 목적이므로 제외 목록이 이 계획의 핵심이다. 아래는 **읽기만 하고
수정하지 않는다.**

```text
src/app/(root)/template-studio/**
src/app/(root)/admin/**
src/app/(root)/time-table/**
src/app/(root)/team-time-table/**
src/app/(root)/thumbnails/**
src/app/(root)/time-table-tester/**
src/app/(root)/_sample/**
src/components/studio/**
src/components/TimeTable/**
src/components/admin/**
src/utils/template-studio/**
src/utils/thumbnail-studio/**
src/utils/routeUtils.ts
src/utils/pageAwareLocalStorage.ts
src/utils/template-links.ts
src/contexts/TimeTableContext.tsx
src/hooks/useTimeTableState.ts
src/app/api/admin/**
```

`src/utils/template-studio/runtime-i18n.ts`의 전역 통합은 04 Phase 3에 남긴다.
Studio 런타임은 이미 자체 `ko`/`en`/`ja` copy를 갖고 있어 이번 범위에서 건드릴
필요가 없다.

### 2.4 locale 식별자

전역은 BCP 47 기준 `ko` / `en` / `ja`를 사용한다. Legacy 템플릿 내부의
`kr`/`en`/`jp` 값은 이번 범위에서 제외되므로 **adapter를 만들지 않는다.**
04 Phase 3에서 템플릿을 다룰 때 도입한다.

## 3. 랜딩 페이지 예외

`src/app/(root)/page.tsx`는 `./_sample/TestComponent`를 import하고, 이 컴포넌트가
`TimeTableContext`와 시간표 런타임을 끌고 들어온다. 즉 랜딩 페이지는 대상이지만
그 안의 샘플 시간표 위젯은 제외 대상 코드다.

처리 방식 (확정):

- 랜딩 페이지의 자체 문자열(헤드라인, CTA, 섹션 카피)은 번역한다.
- `_sample/**`은 **이번 범위에서 제외한다.** 내부 문자열은 한국어로 유지하고
  손대지 않는다.
- 영어·일본어 페이지에서 샘플 위젯이 한국어로 보이는 것을 일단 허용한다. 위젯을
  숨길지 이미지로 대체할지는 이 계획 이후 별도로 판단한다.

`_sample/**`은 Studio 작업 밀집 디렉터리가 아니므로 나중에 별도로 처리해도
충돌 위험은 낮다.

## 4. 충돌 회피 규칙

### 4.1 `(root)` route group을 옮기지 않는다

현재 일반 페이지·Legacy 템플릿·Studio 소비자 페이지·어드민이 **모두
`src/app/(root)/` 한 group 안에** 있다. `(root)`를 `[locale]` 아래로 옮기면
제외 대상까지 전부 이동한다.

따라서 일반 페이지만 새 segment로 옮기고 `(root)`는 그대로 둔다.

```text
src/app/
├─ layout.tsx                 QueryProvider + MaintenanceMode (공유, 최소 변경)
├─ [locale]/
│  └─ (general)/
│     ├─ layout.tsx           신설: locale provider + AuthProvider
│     ├─ page.tsx             랜딩
│     ├─ auth/**
│     ├─ shop/**
│     ├─ my-page/**
│     ├─ portfolio/**
│     ├─ custom-order/**
│     ├─ work-schedule/**
│     ├─ mobile-install/**
│     └─ access-denied/**
└─ (root)/                    유지: 제외 대상 전용
   ├─ layout.tsx              유지
   ├─ time-table/**
   ├─ team-time-table/**
   ├─ template-studio/**
   ├─ thumbnails/**
   ├─ time-table-tester/**
   ├─ _sample/**
   └─ admin/**
```

Next.js는 정적 세그먼트를 동적 세그먼트보다 먼저 매칭하므로 `/time-table/abc`는
`(root)/time-table/[id]`로, `/en/shop`은 `[locale]/(general)/shop`으로 해석된다.

### 4.2 `src/app/layout.tsx`

이 파일은 **Studio 작업 범위가 아니다.** 마지막 커밋은 2025-09-18이고, 현재
working tree의 변경은 `<html lang="kr">` → `"ko"` 한 줄뿐이다. 따라서 파일 자체를
회피할 이유는 없다.

다만 이 파일에서 하려던 두 작업은 성격이 다르므로 분리한다.

- **가능**: `AuthProvider` 승격(§5.1 B), metadata fallback 정리, `lang` 처리.
  Studio와 겹치지 않으므로 이번 범위에서 다룰 수 있다.
- **제외**: 폰트 stack 변경과 `$antialiased` 오타 수정. 파일 충돌이 아니라 **검증
  때문**이다. 두 변경은 PNG 출력물 회귀를 Legacy와 Studio 런타임 양쪽에서
  확인해야 하는데
  ([02 §11.3](./02-locale-routing-and-messages.md#113-png-출력물-회귀-주의)),
  Studio 런타임이 현재 활발히 변경 중이라 비교 기준이 되는 PNG를 고정할 수 없다.
  Studio 작업이 안정된 뒤 독립 단계로 수행한다.

구체적 처리:

- `<html lang>`은 root layout에서 요청 locale을 읽어 설정한다. 일반 도메인은
  `[locale]` segment가 있으므로 값을 알 수 있고, 제외 대상 경로는 `ko`로 둔다.
- metadata는 `[locale]/(general)/layout.tsx`의 `generateMetadata()`에서 locale별로
  생성한다. root layout의 정적 metadata는 fallback으로 남긴다.
- 폰트와 `$antialiased`는 건드리지 않는다. 위 제외 이유를 따른다.

### 4.3 공유 파일 처리

| 파일                            | 일반    | 제외 대상                    | 처리                                   |
| ------------------------------- | ------- | ---------------------------- | -------------------------------------- |
| `BackButton.tsx`                | 6곳     | 없음                         | 그대로 번역. 안전                      |
| `Loading/**`                    | 사용    | 확인 필요                    | 문자열 있으면 prop 주입으로 전환       |
| `auth/ProtectedRoute.tsx`       | my-page | time-table layout, admin 5곳 | **수정하지 않는다.** §5.2              |
| `contexts/AuthContext.tsx`      | 사용    | 전부                         | §5.1. 문자열 추출은 Step 4로 분리      |
| `providers/ClientProviders.tsx` | 사용    | 전부                         | 새 layout에서 재사용만 한다            |
| `UI/**`                         | 사용    | 일부                         | 파일 단위로 확인 후 공유분은 prop 주입 |

원칙은 하나다. **제외 대상과 공유하는 파일은 문자열을 하드코딩에서 빼되,
번역 자체는 호출하는 쪽에서 주입한다.** 공유 파일이 message catalog를 직접
읽으면 제외 대상 화면까지 locale provider에 의존하게 된다.

### 4.4 commit 분리

- route segment 신설과 문자열 추출을 같은 commit에 넣지 않는다.
- 미들웨어 변경은 단독 commit으로 유지한다.
- 화면군별 문자열 추출은 페이지 단위로 쪼갠다.
- `src/app/layout.tsx`를 건드리는 변경은 별도 commit으로 격리해 되돌리기 쉽게
  한다.

## 5. 인증 경계

### 5.1 AuthProvider 분리

`AuthContext`는 httpOnly cookie 기반이다. 마운트 시 `/api/auth/verify`를
`credentials: "include"`로 호출해 상태를 복원한다. 토큰을 메모리나 localStorage에
들고 있지 않다.

따라서 layout이 갈려 `AuthProvider`가 두 개가 되어도 **인증 상태는 유실되지
않는다.** 이 구조가 성립하는 근거다.

비용은 있다. `[locale]/(general)`과 `(root)`는 sibling이므로 두 영역을 넘나들 때
`AuthProvider`가 remount되고 `checkAuth()`가 다시 호출된다. `loading` 상태가
잠깐 노출된다. 실제 발생 지점은 마이페이지에서 템플릿 실행으로 이동할 때다.

`QueryProvider`는 `src/app/layout.tsx`에 있어 공유되므로 React Query cache는
유지된다. remount 대상은 `AuthProvider`뿐이다.

두 가지 선택이 있다.

| 방안    | 내용                                           | 비용                                                   |
| ------- | ---------------------------------------------- | ------------------------------------------------------ |
| A. 수용 | remount와 loading flash를 그대로 둔다          | 경계 이동 시 인증 재확인 1회                           |
| B. 승격 | `AuthProvider`를 `src/app/layout.tsx`로 올린다 | `(root)/layout.tsx`와 새 layout 양쪽에서 provider 제거 |

**B를 권장한다.** §4.2에서 확인했듯 `src/app/layout.tsx`는 Studio 작업 범위가
아니므로 회피할 이유가 없다. `AuthProvider`를 root로 올리면 경계 이동 시
remount가 사라지고, `(root)/layout.tsx`와 새 layout이 각각 provider를 갖는 중복도
없어진다.

`ClientProviders`는 `AuthProvider` 하나만 감싸므로 이동 비용이 작다. 단
`AuthContext`가 client component이므로 root layout이 client boundary를 갖게 되는지
확인하고, 필요하면 `ClientProviders`를 그대로 root에서 사용한다.

A는 B가 어떤 이유로 막힐 때의 대안으로 남긴다.

### 5.2 returnUrl의 locale 손실

`ProtectedRoute`는 인증 실패 시 아래처럼 이동한다.

```ts
const returnUrl = encodeURIComponent(pathname);
router.replace(`/auth?returnUrl=${returnUrl}`);
```

`/auth`가 하드코딩되어 있고 `pathname`을 그대로 returnUrl에 넣는다. `/auth`는
이번 범위에서 `[locale]/(general)/auth`로 옮겨지므로, 미들웨어가 `/auth`를
`/{locale}/auth`로 redirect해 화면 자체는 동작한다.

문제는 그 locale이 재판정된다는 점이다. `/en/my-page`에서 튕겼는데 cookie가
`ko`면 `/ko/auth`로 간다. 사용자가 보던 언어가 바뀐다.

처리 방식:

- `ProtectedRoute` 자체는 수정하지 않는다. 제외 대상과 공유한다.
- 일반 도메인용 wrapper를 새로 만들고 my-page가 그것을 사용한다. wrapper가
  현재 locale을 알고 있으므로 `/{locale}/auth?returnUrl=/{locale}/my-page`를
  직접 만든다.
- returnUrl 검증은 기존 규칙을 따르되 locale prefix를 허용 목록에 포함한다.

### 5.3 제외 대상으로 나가는 링크

일반 도메인에서 제외 대상으로 이동하는 지점은 두 곳뿐이다.

```ts
// src/app/(root)/my-page/page.tsx:158, 162
router.push(template.use_href ?? `/time-table/${template.id}`);
router.push(`/team-time-table/${templateId}`);
```

`use_href`는 서버(`src/app/api/user/templates/route.ts` → `template-links.ts`)에서
생성된다. 템플릿 경로에 locale prefix를 붙이지 않기로 했으므로 **이 코드와
`template-links.ts`를 수정할 필요가 없다.**

따라서 링크 규칙에 예외를 둔다. locale-aware navigation wrapper는 일반 도메인
내부 이동에만 적용하고, 제외 대상으로 나가는 링크는 unprefixed 절대 경로를
그대로 사용한다. 이 예외 목록을 lint 규칙의 allowlist로 관리한다.

## 6. 미들웨어

`src/middleware.ts` 하나가 maintenance 판정과 locale 판정을 모두 담당한다
([02 §2.4](./02-locale-routing-and-messages.md#24-기존-middleware와의-합성)).
이번 범위에서 경로 분류가 **3개**로 늘어난다.

| 분류                         | 예시                                                                                                                   | 처리                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1. 판정 제외                 | `/api/**`, `/_next/**`, `/admin/**`, `/fonts/**`, `/icons/**`, `manifest*`, `robots.txt`, `sitemap.xml`, 이미지 확장자 | 즉시 통과                            |
| 2. prefix 미적용 소비자 경로 | `/time-table/**`, `/team-time-table/**`, `/template-studio/**`, `/thumbnails/**`, `/time-table-tester`                 | maintenance만 적용, locale 판정 없음 |
| 3. prefix 적용 경로          | 위 두 분류에 없는 나머지                                                                                               | locale 판정 및 redirect              |

분류 2가 이번 계획에서 새로 생긴 항목이다. 기존 계획에는 없었다. 이 목록이
새면 템플릿 실행 URL이 `/ko/time-table/...`로 redirect되어 `routeUtils.ts`의
`/time-table/([^/]+)` 정규식이 깨진다. `routeUtils.ts`는 제외 대상이므로 고칠
수 없다. **분류 2 allowlist가 이 계획의 가장 취약한 지점이다.**

주의할 매칭 함정이 하나 더 있다. `(root)/shop`을 옮긴 뒤 옛 URL `/shop`이
들어오면 `[locale]`이 `shop`을 locale로 먹어 랜딩 페이지가 렌더될 수 있다.
locale allowlist 검증과 미들웨어 redirect가 선택이 아니라 필수 전제다.

## 7. message catalog

### 7.1 구조

```text
src/i18n/
├─ config.ts                locale allowlist, default locale, 타입
├─ request.ts               서버 측 locale 해석
├─ navigation.ts            locale-aware Link/router wrapper
├─ format.ts                날짜·숫자·통화 formatter
└─ messages/
   ├─ ko/
   │  ├─ common.json        버튼, 로딩, 공통 오류, 확인 문구
   │  ├─ nav.json           내비게이션, 푸터
   │  ├─ landing.json       랜딩 카피
   │  ├─ auth.json          로그인·회원가입·재설정·인증
   │  ├─ shop.json          상점 목록·상세·구매 신청·plan 기능
   │  ├─ my-page.json       탭, 템플릿 목록, 구매 이력, 작가 프로필
   │  ├─ portfolio.json     목록·상세·카테고리
   │  ├─ custom-order.json  주문 폼, 옵션, 상태
   │  ├─ work-schedule.json 작업 일정
   │  ├─ pwa.json           설치 안내
   │  └─ errors.json        API error code → 메시지
   ├─ en/  (동일 구조)
   └─ ja/  (동일 구조)
```

### 7.2 규칙

- key는 semantic key를 쓴다. 원문을 key로 쓰지 않는다.
- `ko`를 구조 기준으로 삼고 `en`/`ja`의 key 누락·추가는 CI에서 차단한다.
- production에서 locale 간 message fallback을 하지 않는다
  ([02 §6.3](./02-locale-routing-and-messages.md#63-타입과-message-fallback)).
- plan 기능 표시명은 `shop.json`의 `planFeatures.*`로 넣는다. 정본 결정은 §9.1을
  따른다 ([03 §2.2](./03-content-and-template-contracts.md#22-상점-전용-콘텐츠)).
- `errors.json`은 API가 반환하는 안정적인 error code를 key로 쓴다. 현재 API가
  한국어 문장을 직접 반환하므로 code 도입이 선행 작업이다.

## 8. DB 운영 콘텐츠

상점과 포트폴리오는 일반 도메인이므로 DB 콘텐츠 번역이 이번 범위에 포함된다.
필드 소유권은
[03 §2.0](./03-content-and-template-contracts.md#20-필드-소유권)을 따른다.

대상 테이블:

```text
template_translations         (name, description)
shop_template_translations    (detailed_description, purchase_instructions)
portfolio_translations        (title, description)
users.preferred_locale
```

`shop_templates.title`, `features`, `requirements`, `templates.detailed_description`
은 소비자 렌더링 지점이 없어 번역 대상이 아니다.

응답 shape는
[03 §3.1](./03-content-and-template-contracts.md#31-응답-shape-계약)의 계약을
따른다. `select("*")` 제거가 translation join보다 먼저다.

DB 작업은 로컬에서만 수행한다. 원격 반영은 사용자 명시 요청이 있을 때만 한다.

## 9. 단계

각 단계는 독립 commit 묶음이며, 앞 단계가 끝나지 않아도 뒤 단계의 준비는 병행할
수 있다. 충돌 위험도는 Studio 작업 범위와의 파일 겹침 기준이다.

### Step 0. 경계 확정

| 항목      | 내용                                |
| --------- | ----------------------------------- |
| 충돌 위험 | 없음 (문서·조사만)                  |
| 주 산출물 | 문자열 inventory, 용어집, 결정 사항 |

- 대상 15 page의 사용자 노출 문자열 inventory 작성
- `src/components/{Loading,UI}/**`에서 제외 대상과 공유되는 파일 식별
- 현재 한국어 핵심 흐름 E2E 기준 고정: 메인 → 로그인 → 상점 → 상세 → 구매
  신청 → 마이페이지
- `?lang` / unprefixed URL 유입 기준선 계측 시작

완료 조건: 각 문자열에 target namespace가 배정되고, 공유 파일 목록이 확정된다.

#### Step 0 확정 사항

아래는 결정이 끝나 Step 0에서 다시 논의하지 않는다.

| 항목                 | 확정                                                              |
| -------------------- | ----------------------------------------------------------------- |
| 작업 공간            | 별도 git worktree에서 Step 1~4 수행, Step 5는 메인 워크트리 (§13) |
| `AuthProvider`       | root layout으로 승격 (§5.1 방안 B)                                |
| `src/app/layout.tsx` | 사용 가능. Studio 작업 범위가 아님 (§4.2)                         |
| 폰트·`$antialiased`  | 이번 범위 제외. PNG 비교 기준을 고정할 수 없음 (§4.2)             |
| 랜딩 `_sample`       | 범위 제외, 한국어 유지 (§3)                                       |
| route group 이름     | `[locale]/(general)`                                              |
| plan 기능 정본       | 상세 화면 문구. 구매 모달을 그에 맞춰 재작성 (§9.1)               |
| 병합 방식            | rebase 대신 merge (§13.4)                                         |

#### 9.1 plan 기능 한국어 정본 (확정)

`template_plans`의 boolean 5개에 대해 상세 화면과 구매 모달이 서로 다른 한국어를
쓰고 있었다. **상세 화면 문구를 정본으로 확정하고, 구매 모달을 그에 맞춰
재작성한다.**

| boolean             | 정본 (기존 상세 화면)       | 폐기 (기존 구매 모달) | message key                       |
| ------------------- | --------------------------- | --------------------- | --------------------------------- |
| `is_artist`         | 팬아트 아티스트명 작성 기능 | 아티스트 이미지 지원  | `shop.planFeatures.artist`        |
| `is_memo`           | 주간 메모 기능              | 메모 기능             | `shop.planFeatures.memo`          |
| `is_multi_schedule` | 단일 요일 다중 시간표 기능  | 다중 일정 지원        | `shop.planFeatures.multiSchedule` |
| `is_guerrilla`      | 게릴라 방송 설정 기능       | 게릴라 일정 지원      | `shop.planFeatures.guerrilla`     |
| `is_offline_memo`   | 오프라인 메모 기능          | 오프라인 메모         | `shop.planFeatures.offlineMemo`   |

`is_artist`는 두 문구의 상세도가 아니라 **의미가 달랐다.** 정본 확정에 따라 이
기능은 "팬아트 아티스트명을 작성하는 기능"이다. 구매 모달의 "아티스트 이미지
지원"은 부정확한 표현이므로 폐기한다.

구현 시:

- `TemplateDetailContent`의 `getPlanFeatures()`와 구매 모달
  (`shop/[id]/page.tsx:387-391`)의 하드코딩 `<li>` 5개를 같은 message key 조회로
  통합한다. 두 화면이 문구를 각자 들고 있지 않게 한다.
- ko catalog 값은 위 정본을 그대로 쓴다. en/ja는 이 정본을 원문으로 번역한다.
- 구매 모달의 목록은 `list-disc list-inside text-sm`이라 긴 문구가 넘치지 않고
  줄바꿈된다. 오버플로 위험은 없다. 다만 `list-inside`는 줄바꿈 시 둘째 줄이
  불릿 아래로 들여쓰이지 않으므로, 두 줄이 되는 문구에서 정렬을 확인한다.

### Step 1. i18n 기반

| 항목      | 내용                  |
| --------- | --------------------- |
| 충돌 위험 | 없음 (전부 신규 파일) |
| 주 변경   | `src/i18n/**` 신설    |

- `next-intl` 도입
- `src/i18n/{config,request,navigation,format}.ts` 작성
- `ko` catalog 생성 (기존 한국어 문자열을 그대로 옮긴다)
- `en`/`ja` catalog는 key만 있는 빈 골격으로 생성
- key parity / ICU parse 검사 스크립트 작성

완료 조건: catalog 검사 스크립트가 통과하고, 아직 어떤 화면도 바뀌지 않는다.

### Step 2. 라우팅

| 항목      | 내용                                                      |
| --------- | --------------------------------------------------------- |
| 충돌 위험 | 낮음 (`src/middleware.ts`는 Studio 범위 밖)               |
| 주 변경   | `src/app/[locale]/(general)/**` 신설, `src/middleware.ts` |

- `[locale]/(general)/layout.tsx` 신설: locale provider + `ClientProviders`
- 대상 15 page를 `[locale]/(general)/` 아래로 이동
- `(root)`에는 제외 대상만 남김
- locale validation과 not-found
- 미들웨어 3분류 구현 (§6)
- maintenance redirect 목적지를 `/{resolvedLocale}`로 변경
- unprefixed 옛 URL → `/{locale}/...` 308 redirect
- `custom-order/layout.tsx`의 `router.replace("/")`를 locale-aware로 변경
- my-page용 일반 도메인 인증 wrapper 신설 (§5.2)

완료 조건:

- `/ko/**`가 기존 `/**`와 기능적으로 동일하다
- `/time-table/**`, `/team-time-table/**`, `/template-studio/**`가 redirect 없이
  기존과 동일하게 동작한다
- maintenance on/off 두 상태에서 redirect loop가 없고 locale이 보존된다
- `/shop` 같은 옛 URL이 locale로 오인되지 않는다
- 아직 문자열은 한국어 그대로다

### Step 3. 화면 문자열 추출

| 항목      | 내용                                                             |
| --------- | ---------------------------------------------------------------- |
| 충돌 위험 | 낮음 (일반 도메인 전용 컴포넌트)                                 |
| 주 변경   | `src/components/{LandingPage,shop,my-page,mobile}/**`, 대상 page |

페이지 단위로 쪼개 진행한다. 순서는 의존성이 적은 것부터다.

1. `access-denied`, `mobile-install` (문자열 적고 의존 없음)
2. `auth/**` 4개 화면
3. `portfolio/**`
4. `work-schedule`
5. `shop/**` (목록 → 상세 → 구매 신청)
6. `my-page` (탭 5개)
7. 랜딩 (`_sample` 제외)
8. `custom-order`

각 화면에서 함께 처리할 것:

- 하드코딩 한국어 → message key
- `₩` 문자열 결합과 `toLocaleString()` 직접 호출 → 공통 formatter
- 내부 링크 → locale-aware navigation wrapper
- 제외 대상으로 나가는 링크는 unprefixed 유지 (§5.3)

완료 조건: 대상 화면에 한국어 literal이 남지 않고, `ko`에서 화면이 이전과 동일
하다.

### Step 4. 공유 파일과 오류 메시지

| 항목      | 내용                                                 |
| --------- | ---------------------------------------------------- |
| 충돌 위험 | 중간 (`src/contexts/AuthContext.tsx`는 전 영역 공유) |
| 주 변경   | `AuthContext`, 공유 UI, API error code               |

- API route가 한국어 문장 대신 안정적인 error code를 반환하도록 변경
- `errors.json`에 code → 메시지 매핑
- `AuthContext`의 로그인·회원가입 오류 문자열과 로그아웃 모달 카피를 외부
  주입으로 전환
- `Loading`, `UI` 중 공유 파일의 문자열을 prop 주입으로 전환

공유 파일을 다루므로 이 단계만 별도 브랜치로 두고, 제외 대상 화면의 회귀를 함께
확인한다.

완료 조건: 제외 대상 화면(템플릿 실행, 어드민)이 이전과 동일하게 동작한다.

### Step 5. DB 콘텐츠와 API

| 항목      | 내용                                               |
| --------- | -------------------------------------------------- |
| 충돌 위험 | 낮음                                               |
| 주 변경   | `supabase/migrations/**`, 소비자 공개 API, service |

선행 작업으로 응답 shape를 먼저 정리한다.

1. 소비자 공개 API의 `select("*")`를 컬럼 명시로 전환. 이 단계에서 기존 한국어
   화면이 그대로 동작하는지 확인한다
2. translation table migration (§8)
3. `ko` 데이터 backfill
4. locale-aware 조회와 `content_locale` 응답 필드
5. React Query key에 locale 포함
6. `users.preferred_locale` 저장·조회
7. Supabase generated type 갱신

완료 조건:

- 로컬 DB reset과 원격 복제 데이터 양쪽에서 migration이 통과한다
- `en`/`ja` 응답에 base 한국어 텍스트 컬럼이 포함되지 않는다
- translation row가 없어도 기존 한국어 서비스가 동작한다
- 원격 DB는 변경하지 않는다

### Step 6. metadata·SEO·PWA

| 항목      | 내용                                                 |
| --------- | ---------------------------------------------------- |
| 충돌 위험 | 낮음 (`src/app/layout.tsx`를 건드리지 않는 범위에서) |
| 주 변경   | `[locale]/(general)/layout.tsx`, manifest route      |

- `generateMetadata()`로 locale별 title·description·openGraph 생성
- `hreflang` alternate와 canonical
- manifest를 locale별로 제공하고 `start_url`에 locale 반영
- PWA cache key에 locale 포함, cache version 상향

`<html lang>`을 root layout에서 locale별로 바꾸는 작업은 §4.2에 따라 이 단계에
포함하지 않는다. Studio 작업 종료 후 별도로 처리한다.

### Step 7. 번역 투입과 검증

| 항목      | 내용 |
| --------- | ---- |
| 충돌 위험 | 없음 |

- `en` catalog 번역 및 검수
- `ja` catalog 번역 및 검수
- 상점·포트폴리오 콘텐츠 `en`/`ja` 입력 및 검수
- §10 검증 수행

## 10. 검증

### 10.1 정적

```text
scripts/check-i18n-catalog.ts              key parity, ICU parse
scripts/check-i18n-hardcoded-copy.ts       대상 범위의 한국어 literal 탐지
scripts/check-i18n-route-links.ts          locale-aware 링크 사용, 예외 allowlist
scripts/check-i18n-api-response-shape.ts   select("*") 및 base 컬럼 동시 반환 탐지
```

`check-i18n-hardcoded-copy.ts`는 제외 대상 디렉터리(§2.3)를 스캔 범위에서
빼야 한다. 그러지 않으면 Legacy·Studio의 한국어 때문에 항상 실패한다.

### 10.2 라우팅

maintenance 모드와 locale 판정이 한 미들웨어에 있으므로 조합으로 검증한다.

| maintenance | 요청 URL               | 기대                             |
| ----------- | ---------------------- | -------------------------------- |
| off         | `/en/shop`             | 통과                             |
| off         | `/shop`                | `/{locale}/shop` 308 1회         |
| off         | `/time-table/abc`      | 통과. redirect 없음              |
| off         | `/template-studio/abc` | 통과. redirect 없음              |
| off         | `/admin/...`           | 판정 미적용                      |
| on          | `/en/shop`             | `/en`으로 redirect (locale 보존) |
| on          | `/en`                  | 통과. 재 redirect 없음           |
| on          | `/time-table/abc`      | `/{locale}`로 redirect           |

redirect chain이 2회 이상이면 실패로 처리한다.

### 10.3 제외 대상 회귀

이 계획의 목적이 충돌 회피이므로, 제외 대상이 그대로인지 확인하는 것이 가장
중요한 검증이다.

- 템플릿 실행 화면(Legacy, Studio)이 이전과 동일하게 동작한다
- 시간표 PNG 저장 결과가 변하지 않는다
- 어드민 화면이 이전과 동일하게 동작한다
- 마이페이지 → 템플릿 실행 이동이 동작하고, 인증 상태가 유지된다
- `routeUtils.ts`의 템플릿 ID 추출이 계속 동작한다

### 10.4 화면

- `ko` 회귀 → `en` → `ja` → 반응형 순서
- 일본어·영어의 문자열 확장으로 인한 overflow 확인
- pseudo-locale로 누락 key 탐지 (production allowlist에 넣지 않는다)

폰트 검증은 §4.2에 따라 이번 범위 밖이다. 다만 일본어 화면에서 시스템 fallback
서체로 레이아웃이 깨지는지는 확인하고, 발견 사항을 폰트 작업 단계로 넘긴다.

## 11. 공개와의 관계

이 계획을 끝내면 일반 도메인의 `en`/`ja`가 동작하는 상태가 된다. 그러나 상점에서
구매한 템플릿의 실행 화면은 여전히 Legacy가 한국어다. Studio 엔진 템플릿은
자체 런타임 copy로 `en`/`ja`를 이미 지원한다.

따라서 `/en`·`/ja` 공개는 최소한 아래 중 하나가 정해져야 한다.

- 04 Phase 3에서 Legacy 템플릿 번역을 완료한다
- 해당 locale 상점에 Studio 엔진 상품만 노출한다
- 템플릿 실행 화면의 언어 제약을 구매 전에 안내한다

이 선택은 제품 정책 결정이며 이 문서에서 정하지 않는다. 개발은 공개 결정과
무관하게 진행할 수 있고, `/en`·`/ja` route는 feature flag 뒤에 둔 상태로 병합한다.

## 12. 미해결 항목

| 항목                                              | 필요 시점      | 성격      |
| ------------------------------------------------- | -------------- | --------- |
| `src/components/{Loading,UI}/**`의 공유 파일 목록 | Step 0         | 조사      |
| `ja` 번역 검수 담당자                             | Step 7         | 리소스    |
| 호환 계층 제거 임계값의 기준선 실측치             | Step 0 계측 후 | 실행      |
| `/en`·`/ja` 공개 전략 (§11)                       | 이 계획 이후   | 제품 정책 |

`/en`·`/ja` 공개 전략은 개발을 막지 않는다. route를 feature flag 뒤에 둔 상태로
진행한다. 단 "해당 locale 상점에 Studio 엔진 상품만 노출"을 택할 가능성이 있으면
Step 5에서 상점 쿼리에 엔진 필터 자리를 미리 남긴다.

## 13. 작업 공간 운영

Studio 작업과의 간섭을 줄이기 위해 별도 git worktree에서 작업한다. 이 저장소는
이미 worktree를 쓰고 있어 검증된 방식이다.

```text
/Users/kwakori/projects/promotion/temis         features/template-system  (메인)
/Users/kwakori/projects/promotion/temis-v2-dev  temis-template-system-v2-dev
```

### 13.1 범위 분담

| 단계        | 작업 위치     | 이유                                                                       |
| ----------- | ------------- | -------------------------------------------------------------------------- |
| Step 0      | 메인          | 문서·조사만                                                                |
| Step 1~4    | 신규 worktree | 코드 격리 효과가 그대로 나온다                                             |
| Step 5 (DB) | **메인**      | 로컬 Supabase 스택과 `src/types/supabase.ts`를 공유하므로 격리 이득이 없다 |
| Step 6~7    | 신규 worktree |                                                                            |

Step 5를 분리하지 않는 이유는 §13.3에 있다.

### 13.2 생성 절차

```text
1. 다국어 문서를 메인에서 별도 커밋
2. features/template-system 에서 다국어 브랜치 분기
3. worktree 생성
4. .env.local, .envrc, .mcp.json 복사        (gitignore 대상이라 승계되지 않음)
5. npm install                               (node_modules 약 600M 신규)
6. npm run dev:local -- -p 3001              (포트 충돌 회피)
```

`scripts/dev-local.cjs`는 인자를 `dev:next`로 그대로 넘기므로 포트 지정이
동작한다. 원격 데이터 복원은 별도 `npm run db:restore:remote` 명령으로 수행하며,
`rootDir`도 워크트리 기준으로 해석된다.

### 13.3 로컬 Supabase 스택 공유

`supabase/config.toml`의 `project_id = "temis"`가 커밋되어 있다. 따라서 새
worktree에서 `supabase start`를 실행해도 **같은 컨테이너와 같은 로컬 DB를
사용한다.**

```text
supabase_db_temis    56322
supabase_kong_temis  56321
```

주의사항:

- 두 워크트리가 같은 로컬 DB를 공유한다. 한쪽에서
  `npm run db:restore:remote -- --fresh-local`을 실행하면 DB가 교체되어
  **다른 쪽 데이터도 초기화된다.** 다국어 worktree에서는 복원 명령을 실행하지
  않는다.
- 다국어 작업이 translation table migration을 추가하면 공유 DB에 반영되어 Studio
  쪽에서도 보인다. 이 때문에 Step 5를 메인에서 수행한다.
- 별도 스택을 띄우려면 `config.toml`의 `project_id`와 포트 6개를 바꿔야 하는데,
  트래킹 파일이라 병합에서 제외하는 관리 부담이 생긴다. 권장하지 않는다.

### 13.4 병합

**rebase 대신 merge를 사용한다.** 이 작업은 15개 파일을 `[locale]/(general)/`로
옮기는 rename이 포함되어, rebase하면 같은 충돌을 커밋마다 반복해서 만난다.

- 작업 중에는 주기적으로 `features/template-system`을 다국어 브랜치로 merge해
  내려받는다.
- 완료 시 다국어 브랜치를 `features/template-system`으로 merge한다.
- `features/template-system`에 upstream 트래킹이 없으므로 원격 PR 경유가 아니라
  로컬 브랜치 병합으로 진행한다.

### 13.5 실제 충돌 후보

| 파일                           | 위험 | 대응                                                                      |
| ------------------------------ | ---- | ------------------------------------------------------------------------- |
| `src/types/supabase.ts`        | 높음 | 생성 파일. 충돌 시 수동 해결하지 않고 `npm run gen:types` 재생성으로 푼다 |
| `supabase/migrations/**`       | 중간 | 파일명이 타임스탬프라 충돌은 없지만 적용 순서를 확인한다                  |
| `src/contexts/AuthContext.tsx` | 중간 | Step 4 대상이면서 전 영역 공유. 단독 commit으로 격리                      |
| `src/app/layout.tsx`           | 낮음 | Studio 작업 범위가 아님                                                   |
| 일반 도메인 15 page            | 낮음 | Studio 작업 범위가 아님                                                   |

작업 기간 중 메인에서 일반 도메인 페이지를 추가·수정하면 rename과 충돌한다.
이 기간에는 일반 도메인 변경을 다국어 worktree로 모으는 편이 안전하다.

### 13.6 제약

- 메인 워크트리가 `git-common-dir`를 소유한다. 메인 디렉터리 경로를 옮기거나
  삭제하면 파생 worktree가 깨진다.
- worktree마다 `node_modules`(약 600M)와 `.next` 빌드 캐시가 별도로 쌓인다.
  디스크 여유를 주기적으로 확인한다.

## 14. 관련 문서

- [README](./README.md) 전체 개요
- [00 확정된 의사결정](./00-confirmed-decisions.md)
- [01 현황과 범위](./01-current-state-and-scope.md)
- [02 라우팅과 메시지](./02-locale-routing-and-messages.md)
- [03 콘텐츠와 템플릿 계약](./03-content-and-template-contracts.md)
- [04 화면군 마이그레이션](./04-surface-migration-plan.md) 전체 phase 계획
- [05 품질·배포·운영](./05-quality-rollout-and-operations.md)

이 문서는 04의 Phase 0~~2, 4~~5를 일반 도메인 범위로 좁혀 실행 순서로 재구성한
것이다. 04의 Phase 3(템플릿 UI)은 범위에서 제외되며 그대로 유지된다.
