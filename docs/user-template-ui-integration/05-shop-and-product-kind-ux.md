# 05. 상점·상품 종류별 UX

상태: 대기  
선행 조건: 03단계 사용자 카드, 04단계 cover 계약

## 1. 목표

상점과 관리자 상품 화면이 시간표와 썸네일을 구분하고, 각 종류에 맞는 설명과
상품 설정만 제공하게 한다.

## 2. 상점 목록

추가할 기능:

- 전체/시간표/썸네일 종류 필터
- 카드의 종류 badge
- `thumbnail_url` 우선 cover
- 종류별 설명과 CTA
- 구매 완료 템플릿 숨김 필터 유지

문구는 `다양한 시간표 템플릿`처럼 한 종류만 전제하지 않고 `시간표와 썸네일
템플릿` 또는 중립적인 `디자인 템플릿`으로 변경한다.

서버 목록 API에 kind filter를 추가한다면 query param, service 인자, query key를
함께 확장한다. 데이터가 적은 초기에는 클라이언트 필터를 쓸 수 있지만,
페이지네이션이 있다면 서버 filter를 기준으로 한다.

## 3. 상점 상세

상세 화면은 다음을 종류별로 분기한다.

### 시간표

- 시간표 기능과 capability
- 저장되는 사용자 상태 안내
- 시간표 실행 CTA

### 썸네일

- 변경 가능한 텍스트·이미지 입력 설명
- PNG 다운로드 안내
- 작업 결과가 서버 프로젝트로 저장되지 않는다는 안내
- 동일 브라우저 이미지 보관 범위 안내
- 썸네일 실행 CTA

이미 구매한 사용자는 `마이페이지로 이동`만 제공하기보다 정확한 `use_href`로
`바로 사용하기`를 제공할 수 있다. 이때 href 분기를 페이지에서 중복 구현하지
않는다.

## 4. 상품 plan 결정

현재 DB plan 제약은 `lite | pro`다. 초기 구현은 migration 없이 다음 규칙을
사용한다.

- Studio 썸네일: `pro` 단일 plan
- 시간표: 기존 `lite`/`pro` 유지
- 썸네일 상품에서는 시간표 capability boolean을 숨기고 false로 저장
- 가격과 일반 features/requirements/purchase instructions는 공통 사용

향후 썸네일 전용 plan이 필요하면 별도 migration과 구매·정산 영향을 먼저
검토한다. 이번 UI 단계에서 plan enum을 확대하지 않는다.

### 향후 plan 확장 영향 기록

초기 `pro` 단일 plan은 호환을 위한 임시 제품 결정이다. 별도 썸네일 plan을
도입할 때는 최소한 다음 영향을 다시 검토한다.

- `template_plans_plan_check` DB 제약과 생성 타입
- 구매 요청의 plan-template 검증
- `template_access.template_plan_id`
- 판매 준비 상태의 구매 가능 plan 판정
- 가격·정산·로열티 계산
- 상점 필터, badge와 구매 이력 문구
- 기존 썸네일 `pro` 구매자의 이관 또는 호환 정책

시간표 capability boolean을 false로 저장하는 것은 현재 schema의 중립값으로만
해석한다. 썸네일 전용 capability 요구사항이 생기기 전에는 별도 JSON/schema를
선행 도입하지 않는다. 요구사항이 확정되면 kind별 capability 구조와 migration을
별도 설계한다.

## 5. 관리자 상품 편집

`template_engine`과 `template_kind`를 읽어 form을 구성한다.

공통 필드:

- 템플릿 이름과 설명
- 상품 제목과 상세 설명
- 가격
- features
- requirements
- 구매 안내
- 작가와 로열티
- 대표 이미지

시간표 전용:

- 아티스트 이미지
- 메모
- 다중 스케줄
- 게릴라
- 오프라인 메모

썸네일 전용 초기 범위:

- 사용자 이미지 교체 가능 여부 등 문서 input contract 요약 표시
- 시간표 전용 옵션은 렌더하지 않음
- 기본 상품 문구를 썸네일에 맞게 제공

문서 input contract에서 실제 기능을 계산할 수 있으면 서버 또는 공용 pure
함수에서 요약하고, UI가 document JSON을 임의 해석하지 않는다.

## 6. 구매 요청

기존 `POST /api/template-purchase-requests`를 공통 구매 API로 유지한다.

확인할 사항:

- plan이 요청 템플릿의 shop product에 속함
- 상품이 실제 판매 중임
- 템플릿이 published·일반 판매 상태임
- 같은 사용자·템플릿의 pending 요청 중복 정책
- 이미 권한이 있는 사용자의 재구매 정책

중복 pending 요청은 UI disable만 믿지 않고 서버에서도 차단하거나 기존 요청을
반환해야 한다.

## 7. 데이터 계층 정리

- 상세 페이지의 직접 `fetch`를 React Query mutation과 service로 이동한다.
- 구매 성공 후 purchase history, shop access, user templates query를 필요한
  범위에서 invalidate한다.
- 상점 Page에서 직접 Supabase를 사용하지 않는다.
- 기존 `purchase_requests` 기반 레거시 API를 신규 흐름에서 호출하지 않는다.

## 8. 검증

- 종류 필터와 서버 pagination 정합성
- 썸네일 상품에 시간표 옵션 미노출
- 시간표 상품 기존 plan 회귀 없음
- 이미 구매/권한 있음 CTA
- pending 구매 요청 CTA
- 승인 후 바로 사용하기 경로
- 모바일 상세와 구매 form

## 9. 완료 조건

- [ ] 상점에서 시간표와 썸네일을 구분할 수 있다.
- [ ] 썸네일 상품에 시간표 capability가 표시되지 않는다.
- [ ] 구매 API는 두 종류에 동일한 권한을 생성할 수 있다.
- [ ] 중복 pending과 기존 권한 정책이 서버에서 보장된다.
- [ ] 상세 페이지의 구매 요청이 service·React Query 계층을 통과한다.
- [ ] 구매 후 관련 캐시 무효화가 명시되어 있다.
- [ ] 썸네일 전용 plan 도입 시 영향받는 DB·구매·정산·UI 범위가 결정 기록에
      남아 있다.
