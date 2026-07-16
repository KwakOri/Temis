# 05. Beta 등록과 병행 검증

상태: 대기  
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

동일한 DB 시점에서 다음 수치를 기록한다.

| 항목 | 기존/DB 기준 | Hub | 일치 여부 |
| --- | --- | --- | --- |
| 전체 템플릿 |  |  |  |
| Legacy |  |  |  |
| Studio |  |  |  |
| 일반 판매 |  |  |  |
| 맞춤 제작 |  |  |  |
| 상품 구성 |  |  |  |
| 판매 중 |  |  |  |

표본 템플릿은 최소 다음 조합을 포함한다.

- Legacy 일반 판매·판매 중
- Legacy 맞춤 제작
- Studio draft
- Studio published·상품 없음
- Studio published·상품 구성·판매 대기
- Studio published·판매 중
- archived 템플릿

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

## 9. 완료 조건

- Beta 탭 등록 완료
- 기존 두 탭 계속 접근 가능
- 목록 집계와 표본 데이터 일치
- 일반 판매·맞춤 제작 시나리오 통과
- 기존 자동 검증 회귀 없음
- 브라우저 smoke test 통과
- 알려진 차이와 후속 작업 문서화
- 06단계 전환 여부를 판단할 근거 확보

