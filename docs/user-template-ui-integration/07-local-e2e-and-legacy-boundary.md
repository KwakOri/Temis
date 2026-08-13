# 07. 로컬 E2E·회귀 검증과 레거시 경계

상태: 브라우저 자동화 1차 완료 · 수동 시각 검증 대기
선행 조건: 01~06단계 완료

## 1. 목표

로컬 Supabase와 실제 브라우저에서 구매부터 사용자 실행까지 수직 흐름을
검증하고, 신규 UI가 의존하지 않아야 할 레거시 시스템을 확정한다.

## 2. 검증 자동화 정책

검증을 다음 세 계층으로 분리한다.

### A. PR 필수 자동 검증

모든 PR에서 실행한다.

- `npx tsc --noEmit`
- 변경 파일 ESLint
- DB가 필요 없는 pure/static check
- 공용 카드, kind 정규화, cover resolver 단위 테스트

### B. 로컬 출시 후보 필수 자동 검증

로컬 Supabase fixture를 만들고 정리할 수 있는 환경에서 실행한다.

- 권한·구매·런타임 route E2E
- 세 템플릿 종류의 목록과 `use_href`
- Playwright 핵심 사용자 흐름
- 테스트 종료 후 fixture cleanup 확인

초기에는 개발자 로컬 release gate로 운영한다. CI에 로컬 Supabase bootstrap과
브라우저 실행이 안정적으로 준비되면 동일 명령을 별도 CI job으로 승격한다.
승격 전에도 08단계 진입에는 B 계층 결과가 필수다.

### C. 수동 시각 검증

자동 assertion만으로 품질을 판정하기 어려운 항목이다.

- 업로드 이미지 crop과 focus 체감
- PNG 결과의 폰트, stroke, shadow와 투명 배경
- cover의 contain/cover 시각 품질
- 긴 텍스트와 다국어 레이아웃
- 실제 모바일 터치 조작

수동 검증 결과는 실행 날짜, 브라우저, viewport와 함께 체크리스트에 기록한다.

## 3. 자동 API E2E 매트릭스

| 사용자      | 템플릿           | 권한             | 기대 결과                    |
| ----------- | ---------------- | ---------------- | ---------------------------- |
| 구매자      | Legacy 시간표    | template_access  | 목록 노출, legacy 실행       |
| 구매자      | Studio 시간표    | template_access  | 목록 노출, runtime GET/PUT   |
| 구매자      | Studio 썸네일    | template_access  | 목록 노출, thumbnail GET/PNG |
| 작가        | Studio 시간표    | template_artists | 내 작업물, 실행 허용         |
| 작가        | Studio 썸네일    | template_artists | 내 작업물, 실행 허용         |
| 타 사용자   | 모든 종류        | 없음             | 목록 미노출, 실행 403        |
| 관리자      | published Studio | admin            | 실행 허용                    |
| 일반 사용자 | draft/archived   | 권한 행 존재     | 목록 미노출, 실행 거부       |

썸네일 시나리오는 정적 소스 패턴 검사만으로 완료 처리하지 않는다. route handler
또는 실제 HTTP를 통해 kind, entitlement, published revision을 검증한다.

## 4. 구매 수직 흐름

```text
published 일반 판매 템플릿 생성
→ shop_templates와 pro plan 생성
→ 작가·로열티 연결
→ 판매 시작
→ 사용자 구매 요청
→ 관리자 승인
→ template_access 확인
→ /api/user/templates 확인
→ use_href 실행
```

Legacy, Studio 시간표, Studio 썸네일에서 각각 실행한다.

## 5. 브라우저 E2E

최소 브라우저 시나리오:

1. 사용자 로그인
2. 상점 종류 필터
3. 상세와 구매 요청
4. 관리자 승인
5. 사용자 마이페이지 재조회
6. 종류별 카드와 cover 확인
7. 런타임 실행
8. 시간표 값 저장·새로고침 복원
9. 썸네일 텍스트·이미지 입력과 PNG 저장
10. 마이페이지 복귀

viewport:

- 모바일 대표 폭
- 태블릿 대표 폭
- 데스크톱 대표 폭

viewport별 범위를 다음처럼 제한한다.

| 범위                      | 데스크톱                   | 모바일         | 태블릿        |
| ------------------------- | -------------------------- | -------------- | ------------- |
| 구매→승인→실행 전체 흐름  | 자동                       | 핵심 smoke     | 생략 가능     |
| 마이페이지 필터·카드 탐색 | 자동                       | 자동           | 레이아웃 확인 |
| 시간표 runtime 저장       | 자동                       | smoke          | 생략 가능     |
| 썸네일 입력·PNG           | 자동 기능 확인 + 수동 품질 | 수동 터치 확인 | 생략 가능     |
| 카드·상세 반응형          | 시각 확인                  | 시각 확인      | 시각 확인     |

Playwright는 기능 성공과 route 이동을 검증한다. 픽셀 동일성이나 PNG 표현 품질은
Playwright 성공만으로 완료 처리하지 않고 C 계층 수동 검증을 함께 요구한다.

2026-08-09에 로컬 출시 후보용 브라우저 자동화를 추가했다.

```bash
npm run check:user-template-ui:browser-e2e
```

이 명령은 `fixtures-07-browser-e2e-create.sql`로 기존 고정 Legacy row를 보존한
전용 구매자·관리자와 Studio 상품을 만들고, 실행 후
`fixtures-07-browser-e2e-cleanup.sql`로 정리한다. 실제 Playwright 브라우저에서
Shop 필터, Legacy/Studio 시간표/Studio 썸네일 각각의 구매 신청과 관리자 승인,
마이페이지 반영, Legacy route 실행, 시간표 저장·새로고침 복원, 썸네일 입력과 PNG
다운로드, 모바일 가로 overflow를 확인한다.

실행 결과:

```text
07 user-template browser E2E passed
remaining_07_users 0
remaining_07_templates 0
```

자동화에서 제외한 crop/focus 체감, PNG 폰트·stroke·shadow·투명 배경 품질,
다국어·실제 모바일 터치와 태블릿 시각 검증은 C 계층에서 직접 확인해야 한다.

권한 계정 전환이 필요한 시나리오는 쿠키와 React Query cache가 사용자 간에
남지 않는지도 확인한다.

## 6. 회귀 검증

- Legacy `/time-table/{id}` 렌더와 기존 정적 cover
- 팀 템플릿 영역
- Template Studio 관리자 편집·발행
- Thumbnail Studio 관리자 편집·발행·preview
- purchase history와 맞춤 주문 탭
- 관리자 Template Hub 판매 상태
- runtime IndexedDB 이미지 격리

프로젝트 규칙에 따라 기본 검증에서는 production build를 제외하고 다음을
우선한다.

- `npx tsc --noEmit`
- 관련 ESLint
- `check:template-*`
- `check:thumbnail-studio:*`
- 실제 브라우저 실측

## 7. 레거시 경계 감사

신규 사용자 흐름은 다음을 기준 데이터로 사용하지 않는다.

- 독립 `thumbnails` 테이블과 `/api/admin/thumbnails`
- 구 `purchase_requests` 테이블
- `/api/shop/purchase-request`
- `templates.is_shop_visible`
- `template_products`
- Studio 템플릿에 대한 `/thumbnail/{id}.png` 존재 가정

다음은 계속 유지한다.

- Legacy 시간표 route와 정적 cover
- `team_templates` 및 팀 시간표 route
- canonical `templates`, `shop_templates`, `template_plans`
- `template_purchase_requests`, `template_access`, `template_artists`

## 8. 정리 정책

레거시 코드가 신규 UI에서 사용되지 않는 것이 확인돼도 이 단계에서 즉시 삭제하지
않는다.

1. 전체 import·route 호출 검색
2. 운영 데이터 행 수와 최근 사용 확인
3. 대체 경로 확인
4. 별도 정리 계획과 승인
5. 작은 단위 삭제와 회귀 검증

독립 `thumbnails` 데이터의 자동 Studio 이관은 이번 계획 범위가 아니다.

## 9. 출시 후보 체크리스트

- [x] API/브라우저 E2E가 세 템플릿 종류를 모두 포함한다.
- [x] Playwright에서 구매→승인→마이페이지→실행 핵심 흐름이 통과한다.
- [ ] 수동 시각 검증의 환경과 결과가 기록됐다.
- [ ] 미권한·draft·archived 거부가 확인된다.
- [ ] 정의된 viewport별 범위에 따라 UI를 실측했다.
- [ ] 이미지 404와 느린 로딩 상태를 확인했다.
- [ ] 사용자 전환 시 권한·이미지 cache가 섞이지 않는다.
- [ ] Legacy 시간표와 팀 템플릿 회귀가 없다.
- [ ] 신규 UI가 레거시 DB/API를 호출하지 않는다.
- [ ] 남은 문제를 P0/P1/P2로 분류했다.

## 10. 완료 조건

위 출시 후보 체크리스트가 모두 충족되고 P0가 0건이어야 8단계 원격 반영 검토를
시작할 수 있다.
