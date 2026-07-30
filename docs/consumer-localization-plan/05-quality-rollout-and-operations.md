# 05. 검증, 배포, 운영 계획

## 1. 품질 목표

다국어 완료는 문장이 바뀌는 것만 의미하지 않는다. 각 locale에서 기능,
권한, 데이터, 레이아웃, 접근성, 검색 노출, PWA cache가 같은 계약을 지켜야 한다.

## 2. 정적 검증

### 2.1 message catalog

CI에 다음 검사를 추가한다.

- ko/en/ja key set 완전 일치
- ICU message parse
- message 변수명/타입 일치
- 빈 문자열과 임시 번역 marker 차단
- 허용되지 않은 HTML 차단
- production catalog에 pseudo-locale이 포함되지 않음
- `AppLocale`, Studio locale, DB CHECK allowlist 일치

예정 script:

```text
scripts/check-i18n-catalog.ts
scripts/check-i18n-hardcoded-copy.ts
scripts/check-i18n-route-links.ts
scripts/check-i18n-content-readiness.ts
```

hardcoded copy 검사는 주석, 로그, 테스트 fixture, 사용자/템플릿 콘텐츠를
allowlist로 구분한다. 첫 릴리스부터 저장소 전체를 오류 처리하지 않고 신규/변경
consumer 파일부터 차단 범위를 넓힌다.

### 2.2 타입/린트/빌드

기본:

```bash
npx tsc --noEmit
npx eslint <changed files>
npm run build
```

기존 template 검증:

```bash
npm run check:template-studio:runtime
npm run check:template-studio:runtime-v2-ui
npm run check:template-studio:timetable-runtime
npm run check:pilot-e2e
```

새 i18n check는 package script로 등록하고 CI의 필수 check로 만든다.

## 3. 단위/통합 테스트

### 3.1 locale resolution

- prefixed path가 cookie/Accept-Language보다 우선
- invalid locale은 404 또는 명시한 fallback redirect
- unprefixed path의 cookie/Accept-Language/default 우선순위
- `/admin`, `/api`, `_next`, public asset 제외
- `?lang` compatibility와 query 보존
- redirect loop 없음

### 3.2 navigation

- 동적 template/portfolio ID 보존
- category/page/query 보존
- auth returnUrl 보존 및 open redirect 방지
- language switch 후 back/forward 정상
- locale-neutral `use_href`의 UI 경계 prefix 적용

### 3.3 formatter

고정 fixture로 검증한다.

| 값                   | 검증                        |
| -------------------- | --------------------------- |
| KRW 80000            | ko/en/ja 표시 차이, 값 동일 |
| 2026-07-30 date-only | 날짜 밀림 없음              |
| timestamp            | 지정 timezone과 locale      |
| count 0/1/2          | locale별 ICU branch         |
| 09:00 방송 시각      | locale 변경 전후 값 동일    |

### 3.4 API

- locale allowlist와 invalid locale 400
- stable error code/status
- translation → ko → base fallback
- 응답의 `content_locale`
- 권한/판매 filter가 translation join으로 우회되지 않음
- preference API가 token 사용자만 변경
- locale별 query/cache 격리

### 3.5 Template Studio

- 전역 locale별 runtime copy
- 기존 runtime dictionary와 이행 중 parity
- 관리자 Preview fallback
- document v6 read, v7 localized field resolve
- invalid node/input/option localization 진단
- locale 변경 후 saved runtime value 유지
- week/date/crop/image 저장 회귀

### 3.6 Legacy

- `AppLocale ↔ TLanOpt` adapter
- 공통 UI ko/en/ja
- template source placeholder fallback
- locale별 explicit placeholder
- `weekdayOption`/`monthOption` 불변
- localStorage key와 저장 JSON 불변
- file pilot별 PNG 결과 회귀

## 4. 브라우저 E2E

최소 matrix:

| 흐름                        | ko   | en   | ja   |
| --------------------------- | ---- | ---- | ---- |
| 메인/언어 전환              | 필수 | 필수 | 필수 |
| 회원가입/로그인/로그아웃    | 필수 | 필수 | 필수 |
| 상점 list/filter/detail     | 필수 | 필수 | 필수 |
| 구매 요청/오류              | 필수 | 필수 | 필수 |
| 마이페이지 template/history | 필수 | 필수 | 필수 |
| Studio 실행/저장/새로고침   | 필수 | 필수 | 필수 |
| Legacy 파일럿 입력/PNG      | 필수 | 필수 | 필수 |
| 접근 거부/returnUrl         | 필수 | 필수 | 필수 |
| custom order                | 필수 | 필수 | 필수 |
| PWA install/update          | 필수 | 대표 | 대표 |

필수 브라우저:

- Chromium desktop
- 모바일 viewport Chromium
- iOS Safari 실기기 또는 지원 가능한 가장 가까운 검증 환경

인증, 결제 요청, 저장은 테스트 계정/로컬 DB를 사용한다. 운영 데이터에 쓰지 않는다.

## 5. 시각/접근성 검증

### viewport

- 320px
- 390px
- 768px
- 1440px

### 검사

- 버튼/탭/상태 badge 잘림 없음
- 일본어 줄바꿈과 장음/구두점 문제 없음
- 영어 장문에서 modal/header overflow 없음
- 숫자/통화가 카드 폭을 넘지 않음
- template form sidebar horizontal scroll 없음
- focus order와 keyboard language selector 동작
- selector에 현재 언어명과 accessible name 제공
- icon-only action에 locale별 `aria-label`
- `<html lang>`이 screen reader 발음 언어와 일치
- color만으로 locale/상태를 구분하지 않음
- 200% zoom에서도 핵심 흐름 가능

pseudo-locale은 문자열 확장과 누락 발견용으로만 사용한다. 실제 일본어
typography 검증을 대체하지 않는다.

## 6. SEO 검증

공개 페이지별:

- status 200
- 정확한 `<html lang>`
- locale별 title/description
- self canonical
- 준비 완료 locale의 reciprocal `hreflang`
- locale-prefixed internal links
- unprefixed URL의 단일 308 redirect
- sitemap에 공개 locale만 포함
- 인증/마이페이지/템플릿 실행은 기존 정책대로 noindex 여부 확인
- fallback 한국어 콘텐츠를 영어/일본어 canonical로 노출하지 않음

## 7. PWA/cache 검증

- locale path별 document cache가 분리됨
- locale query가 있는 API cache가 분리됨
- 언어 변경 후 offline에서 이전 언어 shell이 섞이지 않음
- manifest name/description/lang 정책 일치
- `/` start_url이 올바른 locale로 이동
- 새 service worker 활성화 후 오래된 cache 정리
- logout 후 사용자별 응답이 cache에서 노출되지 않음

현재 모든 HTTP 요청을 포괄하는 `NetworkFirst` 규칙은 사용자별 API response
cache 위험도 함께 검토해야 한다. 다국어 작업이 인증 응답 cache 범위를
확대하지 않도록 API별 cache allowlist/denylist를 별도 확인한다.

## 8. 번역 운영

### 8.1 역할

| 역할          | 책임                                        |
| ------------- | ------------------------------------------- |
| 기능 개발자   | semantic key, 변수, context note, ko source |
| 번역 담당     | en/ja 번역, 용어집 준수                     |
| 기능 검수자   | 실제 화면 문맥과 기능 확인                  |
| locale 검수자 | 자연스러움, 문화/제품 표기 확인             |
| 릴리스 담당   | readiness report와 flag                     |

### 8.2 workflow

1. 개발자가 ko source와 context를 추가한다.
2. catalog check가 en/ja 미완료를 표시한다.
3. 번역/검수 후 locale readiness를 갱신한다.
4. screenshot/E2E를 통과한다.
5. 기능 flag 또는 locale flag로 공개한다.

긴급 hotfix에서 ko key만 추가할 수는 있지만 en/ja locale에서는 해당 기능을
숨기거나 locale 출시를 차단한다. production에서 조용한 한국어 fallback으로
완료 처리하지 않는다.

### 8.3 콘텐츠 변경

- 상품/포트폴리오 base 콘텐츠 변경 시 translation row를 stale로 표시할
  revision 또는 `source_updated_at` 비교 수단을 둔다.
- locale별 승인 상태가 없으면 공개 locale 조회에서 제외할 수 있다.
- import는 unique key와 dry-run diff를 제공한다.
- 운영 DB 적용 전 row count, overwrite 대상, rollback export를 확인한다.

## 9. 배포 전략

### 9.1 feature flag

최소한 다음을 독립 제어한다.

```text
consumer_i18n_routing
consumer_locale_en
consumer_locale_ja
localized_catalog_content
localized_email
```

flag 명칭과 구현 위치는 프로젝트의 기존 설정 방식을 조사한 뒤 확정한다.
client 환경변수만으로 권한/콘텐츠 조건을 보호하지 않는다.

### 9.2 rollout

1. locale routing을 비공개 상태로 배포하고 `/ko` smoke test
2. 기존 unprefixed 한국어 트래픽을 `/ko`로 이동
3. 내부 계정에 `/en` 공개
4. 영어 콘텐츠/E2E/모니터링 통과 후 일반 공개
5. `/ja`도 같은 절차
6. sitemap/hreflang과 locale 이메일 활성화
7. 호환 storage/query write 제거

### 9.3 rollback

- en/ja locale flag를 끄고 `/ko`로 307/308 정책에 따라 이동
- localized DB join을 끄고 base column 사용
- email locale flag를 끄고 한국어 template 사용
- locale path foundation 자체 문제면 unprefixed 한국어 compatibility route로
  되돌림
- schema는 base column을 유지하므로 translation table 추가를 즉시 되돌릴
  필요가 없다.
- 적용된 migration 파일을 수정하거나 운영 DB를 reset하지 않고 forward-fix를
  사용한다.

## 10. 모니터링

locale dimension을 포함해 다음을 수집한다.

- route 404/redirect loop 비율
- catalog/message missing error
- 알 수 없는 API error code
- translation fallback 사용률
- 상점 list/detail API 오류와 latency
- 로그인/구매 요청/템플릿 저장 성공률
- client hydration error
- PWA cache/update error
- 이메일 template locale별 발송/실패

개인정보, 인증 token, 주문 본문, email 본문을 로그에 남기지 않는다.

## 11. 단계별 go/no-go

### `/en` 공개

- [ ] P0 화면 message 100%
- [ ] 판매 중 상품 content 100%
- [ ] 영어 E2E 전체 통과
- [ ] 전문 검수 완료
- [ ] fallback rate 목표 이하
- [ ] SEO/PWA smoke 완료

### `/ja` 공개

- [ ] P0 화면 message 100%
- [ ] 판매 중 상품 content 100%
- [ ] 일본어 E2E 전체 통과
- [ ] 일본어 locale 검수 완료
- [ ] 모바일 typography/overflow 완료
- [ ] fallback rate 목표 이하

### 호환 계층 제거

- [ ] `?lang` 유입률이 제거 기준 이하
- [ ] `temis.platform.locale` read 사용률이 제거 기준 이하
- [ ] 지원 중인 bookmark/email link가 locale path로 전환
- [ ] Studio 관리자 Preview가 명시 locale로 검증됨
- [ ] rollback 기간 종료

## 12. 최종 인수 테스트

한 테스트 사용자가 다음을 각 locale에서 수행한다.

1. 메인에서 언어를 선택한다.
2. 회원가입 또는 로그인한다.
3. 상점에서 정렬하고 상품 상세를 연다.
4. 구매 요청 또는 권한이 있는 템플릿을 확인한다.
5. 마이페이지에서 주문 상태와 템플릿 정보를 확인한다.
6. Studio 템플릿 값을 저장하고 새로고침한다.
7. Legacy 파일럿 템플릿을 편집하고 PNG를 저장한다.
8. 다른 언어로 바꿔 같은 페이지와 사용자 데이터가 유지되는지 확인한다.
9. 로그아웃 후 다시 로그인해 선호 locale이 복원되는지 확인한다.
10. 이전 unprefixed 링크와 `?lang` 링크가 올바른 locale URL로 이동하는지
    확인한다.

세 locale에서 이 흐름이 통과하고 관리자/권한/저장 회귀가 없을 때 통합 계획을
완료로 본다.
