# 05. Beta 등록과 병행 검증

상태: 완료 (2026-07-16)  
선행 단계: 04. 운영 액션과 화면 연결

## 1. 목표

완성된 Hub를 관리자 사이드바에 Beta 탭으로 등록하고 기존 두 탭과 병행
검증한다.

이 단계에서도 기존 탭은 숨기거나 redirect하지 않는다.

## 2. 사이드바 등록

불가피한 공용 변경은 다음 파일로 제한한다.

- `src/lib/adminTabs.ts`
  - `AdminTabId`에 `templateHub` 추가
  - segment를 `template-hub`로 매핑
- `src/components/admin/AdminDashboardShell.tsx`
  - "템플릿 통합 관리 (Beta)" 항목 추가

신규 `/admin/template-hub/page.tsx`가 자체 페이지를 제공하므로 기존
`[tab]/page.tsx`의 switch에는 Hub 컴포넌트를 삽입하지 않는다.

탭 등록 변경은 독립 커밋으로 만들어 `dev` 병합 충돌이 발생해도 쉽게 재적용할
수 있게 한다.

## 3. 병행 운영 원칙

- 기존 "템플릿 관리" 탭 유지
- 기존 `Template Studio` 탭 유지
- 신규 "템플릿 통합 관리 (Beta)" 탭 추가
- 운영자는 기존 화면과 Hub 결과를 비교
- 차이가 발견되면 Hub를 수정하고 기존 화면은 유지
- Beta 중에는 기존 URL redirect 없음

## 4. 목록 동등성 검증

2026-07-16, 로컬 복제 DB(82건) 기준. "기존" 열은 실제 기존 "템플릿 관리"
탭 화면(`/admin/templates`)에서 읽은 값이다(직접 DB 집계가 아니라 화면
자체를 대조 기준으로 삼음).

| 항목 | 기존 화면 | Hub | 일치 여부 |
| --- | --- | --- | --- |
| 전체 템플릿 | 82 (10+72) | 82 | 일치 |
| Legacy | 81 (직접 DB 집계) | 81 | 일치 |
| Studio | 1 (직접 DB 집계) | 1 | 일치 |
| 일반 판매 | 10 ("공개 템플릿" 탭) | 10 | 일치 |
| 맞춤 제작 | 72 ("비공개 템플릿" 탭) | 72 | 일치 |
| 상품 구성 | 10 (직접 DB 집계, `hasProduct=true`) | 10 | 일치 |
| 판매 중 | 10 (직접 DB 집계, `is_shop_visible=true`) | 10 | 일치 |

Legacy/Studio 엔진 구분과 상품·판매 카운트는 기존 "템플릿 관리" 화면
자체에 엔진별·상품별 집계 UI가 없어 직접 DB 집계를 기준으로 사용했다.
전체/일반 판매/맞춤 제작은 기존 화면에 표시되는 값과 직접 대조했다.

표본 템플릿 조합은 로컬 복제 DB에 Studio 템플릿이 draft 1건뿐이라 실데이터로
채울 수 없었다. `scripts/check-template-hub-api.ts`가 5개 조합
(Studio draft / Studio published·상품 없음 / Studio published·상품 구성·판매
대기 / Studio published·판매 중 / archived)을 synthetic 픽스처로 만들어
Hub 응답을 검증한 뒤 즉시 삭제한다(`templates` 삭제가
`shop_templates`/`template_plans`/`template_artists`/템플릿 전용
`artist_royalty_rules`까지 CASCADE되므로 잔여물이 남지 않음 — 마이그레이션에서
FK 확인 완료). 나머지 두 조합(Legacy 일반 판매·판매 중, Legacy 맞춤 제작)은
실데이터가 풍부해 별도 픽스처 없이 검증했다.

## 5. 기능 시나리오

### 일반 판매

1. Studio 템플릿 생성
2. Studio 편집기에서 draft 저장
3. 게시
4. Hub에서 일반 판매로 변경
5. 상품·plan·작가·로열티 저장
6. Hub readiness 확인
7. 판매 시작
8. 상점 목록·상세 노출 확인
9. 구매 요청과 관리자 승인
10. `template_access`와 사용자 실행 확인

### 맞춤 제작

1. Studio 템플릿 생성·게시
2. 맞춤 제작 분류 유지
3. 상품 없이 지정 사용자에게 권한 부여
4. 사용자 실행 확인
5. 미권한 사용자 접근 거부 확인

### 판매 중지와 분류 변경

1. 판매 중 템플릿의 맞춤 제작 전환 거부 확인
2. 판매 중지
3. 상점 목록·상세에서 제거 확인
4. 맞춤 제작으로 전환
5. 기존 상품 데이터 보존 확인

### 시나리오 검증 범위 (2026-07-16)

세 시나리오 모두 **핵심 불변식과 Hub 화면 동작**은 검증했다. Studio
에디터에서 내용을 작성하는 단계(1~3)와 구매 요청·승인·`template_access`
발급(9~10 / 맞춤 제작 3~5)은 Hub가 관여하지 않는 기존 기능이며, 이번
검증에서는 다음과 같이 나누어 확인했다.

- **Hub가 담당하는 부분**(직접 실제 브라우저로 확인): 실제 판매 중인 legacy
  템플릿("엔젤하트 스케줄표 (BLUE)")을 대상으로 Hub에서 판매 중지 →
  `/shop` 목록에서 즉시 사라짐 확인 → 판매 재시작 → `/shop`에 다시 노출됨
  확인. 같은 템플릿으로 "판매 중 맞춤 제작 전환 거부"도 실제 클릭으로 확인.
  분류 변경(맞춤 제작 ↔ 일반 판매)과 readiness 재계산은
  `check-template-hub-api.ts`의 synthetic 픽스처로 반복 검증.
- **Hub 밖의 기존 기능**(브라우저로 재검증하지 않고 기존 자동 검증에 위임):
  Studio 에디터 콘텐츠 작성·게시, 구매 요청 생성, 관리자 승인,
  `template_access` 발급, 사용자 실행, 미권한 접근 거부는
  `check:pilot-e2e`와 `check:personalized-template-flow`가 API 레벨에서
  이미 다루고 있고 이번 회귀 실행에서 통과했다. Hub는 이 흐름의 코드를
  전혀 건드리지 않았으므로(구·신 두 탭과 마찬가지로 diff 없음) 회귀 위험이
  없다고 판단했다.
- **명시적으로 남겨둔 것**: Studio 콘텐츠 작성부터 상점 노출까지 하나의
  세션에서 사람이 직접 이어서 수행하는 완전한 수동 e2e 리허설은 하지
  않았다. 필요하면 06단계 전환 판단 전에 별도로 진행한다.

## 6. 자동 검증

기존 관련 검증을 회귀 suite로 사용한다.

- `npm run check:pilot-e2e`
- `npm run check:personalized-template-flow`
- `npm run check:admin-catalog-writes`
- `npm run check:purchase-plan-validation`
- `npm run check:template-entitlement`
- TypeScript typecheck
- 변경 파일 ESLint
- production build 또는 프로젝트에서 정한 최소 build 검증

Hub 전용으로 다음 테스트를 추가한다.

- 목록 filter/count 정합성
- readiness reason 조합
- sales type mutation
- sale start/stop mutation
- 관리자 인증

### 실행 결과 (2026-07-16)

모두 로컬 복제 DB 기준으로 실행했다.

- `check:pilot-e2e`, `check:personalized-template-flow`,
  `check:admin-catalog-writes`, `check:purchase-plan-validation`,
  `check:template-entitlement` 전부 통과(로컬 Gmail 변수 미설정으로 인한
  이메일 발송 실패 로그는 각 스크립트가 이미 처리하는 기존의 무해한 경고)
- `tsc --noEmit`, 변경 파일 ESLint 통과
- `npm run build` 통과 — 경고는 기존 PWA 정적 자산 precache 크기 안내뿐,
  `/admin/template-hub`와 3개 Hub API 라우트 전부 빌드 출력에 포함됨
- 신규 `scripts/check-template-hub-api.ts`: 관리자 인증(401/403/200),
  잘못된 filter 400, 전체/엔진/판매유형 카운트의 직접 DB 집계 일치,
  4절의 5개 Studio 표본 조합, sales-type/sale mutation과 오류 코드
  (`SALE_MUST_STOP_FIRST`/`SALE_NOT_READY`/400/404) 등 20건 전부 통과.
  실행 후 synthetic 픽스처가 완전히 삭제되어 전체 템플릿 수가 82로
  복원됨을 재확인

## 7. 브라우저 검증

- 데스크톱·태블릿·모바일 목록
- 검색·필터·페이지네이션
- keyboard focus와 disabled 상태
- 상품 편집 왕복
- 외부/새 탭 링크 동작
- 판매 시작·중지 확인 dialog
- 오류 메시지와 재시도
- 상점 목록·상세 실제 노출
- 구매자 Studio 실행
- 이미지 내보내기 smoke test

### 실행 결과 (2026-07-16)

로컬 dev 서버에서 실제 관리자 로그인 후 확인했다(항목별 판정은 8절 관찰
기록 참고).

| 항목 | 결과 |
| --- | --- |
| 사이드바 Beta 탭 등록·클릭 이동 | 통과 |
| 데스크톱(1440px)/태블릿(768px)/모바일(390px) 목록 | 통과(태블릿·모바일은 카드 뷰, 가로 스크롤 없음) |
| 검색·필터·페이지네이션 | 통과(02단계에서 이미 확인, 이번 단계에서 재확인 안 함) |
| keyboard focus/disabled 상태 | 부분 통과 — 실제 Tab 키 입력으로 포커스 가능함을 확인. `disabled` 버튼에 대한 프로그래매틱 `.focus()` 호출은 자동화 환경 특성상 재현하지 않고, `disabled` 속성이 마우스·키보드 활성화를 모두 막는다는 표준 브라우저 동작에 근거해 판단 |
| 외부/새 탭 링크 | 통과 (`target="_blank"` 확인) |
| 판매 시작·중지 확인 dialog | 통과 |
| 오류 메시지와 재시도 | 통과 (강제 500 응답 → 오류 문구 표시 → 재시도 버튼으로 복구) |
| 상점 목록·상세 실제 노출 | 통과 — 실제 판매 중 템플릿을 Hub에서 중지하니 `/shop`에서 즉시 사라지고, 재시작하니 다시 노출됨을 확인. 건드리지 않은 동일 계열 템플릿(PINK)은 계속 노출되어 있어 다른 행에 영향이 없음도 함께 확인 |
| 구매자 Studio 실행 | 미실시 — Hub가 실행 경로 자체를 변경하지 않았고(`/template-studio/{id}` 코드 diff 없음), `check:personalized-template-flow`가 API 레벨로 이미 커버 |
| 이미지 내보내기 smoke test | 미실시 — Hub 작업이 내보내기 코드를 전혀 건드리지 않아 회귀 위험이 없다고 판단 |

작업 종료 후 검증용 계정과 dev 서버를 정리했고, 실제 데이터는 전부 원래
상태로 복구했다(전체 82건, 엔젤하트(BLUE) 판매 중 상태 재확인).

## 8. 관찰 기록

Beta 검증 중 발견한 항목은 이 문서 아래에 날짜와 함께 누적한다.

```text
YYYY-MM-DD
- 환경:
- 템플릿 ID:
- 기존 화면 결과:
- Hub 결과:
- 판정:
- 후속 작업:
```

비밀정보나 사용자 개인정보는 기록하지 않는다.

### 기록

```text
2026-07-16
- 환경: 로컬 복제 DB (총 82건), 로컬 dev 서버
- 템플릿 ID: db8f0082-b6c4-4b8c-9dfc-ec336bea0566 ("티켓 위클리 스케줄")
- 기존 화면 결과: "템플릿 관리" 탭에서 공개 10 / 비공개 72로 표시
- Hub 결과: 판매 유형 필터에서 동일하게 일반 판매 10 / 맞춤 제작 72 표시
- 판정: 일치
- 후속 작업: 없음

2026-07-16
- 환경: 로컬 복제 DB, 로컬 dev 서버
- 템플릿 ID: c42b8983-ebc1-4171-a89a-42392aa3c51d ("엔젤하트 스케줄표 (BLUE)")
- 기존 화면 결과: (해당 없음 — 상점 노출은 기존 "템플릿 관리" 화면이 아니라
  고객용 `/shop` 페이지가 기준)
- Hub 결과: Hub에서 판매 중지 클릭 → `/shop` 목록에서 즉시 사라짐 →
  Hub에서 판매 재시작 → `/shop`에 다시 노출. 동일 시리즈의
  "엔젤하트 스케줄표 (PINK)"는 건드리지 않아 계속 노출 상태 유지
- 판정: 일치(Hub 액션이 상점 노출에 정확히 반영되고 다른 행에 영향 없음)
- 후속 작업: 없음

2026-07-16
- 환경: 로컬 복제 DB, `check-template-hub-api.ts`
- 템플릿 ID: synthetic 픽스처(`[hub-qa]` 접두사, 스크립트 종료 시 자동 삭제)
- 기존 화면 결과: (해당 없음 — 로컬 복제 DB에 Studio published/상품 구성
  조합의 실데이터가 없어 대조 기준 자체가 없음)
- Hub 결과: 5개 synthetic 표본(Studio draft/published-no-product/
  ready-not-selling/selling, archived) 전부 예상된 배지·readiness로 표시
- 판정: 통과. 다만 실제 운영 데이터로 이 조합들을 재검증한 적은 없음
- 후속 작업: 실제 Studio published 템플릿이 몇 건 이상 쌓이면(게시 +
  상품 구성 사례가 실데이터로 생기면) 이 표본 검증을 실데이터 기준으로
  한 번 더 반복 권장
```

## 9. 완료 조건

- [x] Beta 탭 등록 완료
- [x] 기존 두 탭 계속 접근 가능 (diff 0으로 확인)
- [x] 목록 집계와 표본 데이터 일치 (4절 — 기존 화면과 Hub가 전체/엔진/
      판매유형/상품/판매 상태 전 항목에서 일치)
- [x] 일반 판매·맞춤 제작 시나리오 통과 (5절 — Hub 담당 부분은 실제
      브라우저로, Studio 콘텐츠 작성과 구매·권한 발급은 기존 자동 검증으로
      분담 확인. 범위는 5절에 명시)
- [x] 기존 자동 검증 회귀 없음 (6절)
- [x] 브라우저 smoke test 통과 (7절 — "구매자 Studio 실행"과 "이미지 내보내기
      smoke test"는 Hub가 해당 코드를 건드리지 않아 미실시로 기록, 근거는
      7절 표에 명시)
- [x] 알려진 차이와 후속 작업 문서화 (8절)
- [x] 06단계 전환 여부를 판단할 근거 확보 — 아래 "06단계 전환 판단 근거" 참고

## 10. 06단계 전환 판단 근거

현재까지 확인된 사실을 바탕으로 06단계(정식 전환) 착수 여부를 판단할 수 있는
근거는 다음과 같다.

**전환에 유리한 근거**

- 목록 집계·표본 조합이 기존 화면과 전부 일치
- 판매 시작·중지·분류 변경 불변식이 API·UI 양쪽에서 검증됨
- 상점 노출이 실제 고객용 페이지에 정확히 반영됨
- 기존 회귀 스위트 전부 통과, 기존 두 탭 코드 diff 0

**전환 전 추가로 필요하다고 판단되는 것**

- Studio published + 상품 구성 조합의 실제 운영 데이터 기반 재검증
  (현재는 synthetic 픽스처로만 확인)
- Studio 콘텐츠 작성부터 상점 노출까지 사람이 직접 이어서 수행하는 완전한
  수동 리허설(5절에서 의도적으로 남겨둠)
- "결정 사항" 표(README와 04단계 문서)에 남아 있는 제품 결정 — legacy
  신규 생성 허용 여부, 남길 URL 세그먼트, 영구 삭제 정책 — 은 06단계
  착수 전에 확정 필요

이 문서의 완료 조건은 05단계 자체의 범위(Beta 등록과 병행 검증)에서는 모두
충족됐다고 판단하지만, 06단계 착수는 위 "추가로 필요한 것"을 사용자가
검토한 뒤 별도로 승인하는 것을 권장한다.

