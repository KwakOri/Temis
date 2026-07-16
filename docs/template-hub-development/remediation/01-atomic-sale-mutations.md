# 01. 판매 상태 변경의 원자성 보장

- 우선순위: P1
- 상태: 미수정
- 영향 영역: 판매 시작·중지, 일반 판매·맞춤 제작 전환

## 문제

현재 판매 mutation은 다음 순서로 실행된다.

```text
현재 Hub item 조회
→ 애플리케이션에서 전환 가능 여부 판정
→ 별도 UPDATE 실행
→ 변경된 Hub item 재조회
```

관련 구현:

- [`updateTemplateSalesType()`](../../../src/services/server/templateHubService.ts)
- [`updateTemplateSaleVisibility()`](../../../src/services/server/templateHubService.ts)

판정 함수 자체는 순수 함수로 잘 분리되어 있지만, 조회와 쓰기가 하나의 DB
트랜잭션으로 묶여 있지 않다. 따라서 서로 다른 관리자가 같은 템플릿에 동시에
요청하면 두 요청이 동일한 이전 상태를 읽고 모두 통과할 수 있다.

대표 경합:

```text
요청 A: 판매 시작
요청 B: 맞춤 제작으로 전환

A와 B가 모두 "판매 중 아님 + 일반 판매" 상태를 조회
→ A는 shop_templates.is_shop_visible=true
→ B는 templates.is_public=false
→ 최종 상태: 맞춤 제작 + 판매 중
```

이 상태는 Hub가 지키려는 핵심 불변식과 고객 상점 노출 의미를 동시에 깨뜨린다.

## 수정 방향

DB가 최종 판정과 쓰기를 한 트랜잭션 안에서 수행하도록 한다.

권장안은 Hub 전용 PostgreSQL 함수 두 개를 만들고 `SECURITY DEFINER` 사용 시
`search_path`, 실행 권한, 입력 검증을 명시하는 방식이다.

1. 판매 유형 변경 함수
   - 대상 `templates` 행과 연결 `shop_templates` 행을 잠근다.
   - 현재 판매 중이면 맞춤 제작 전환을 거부한다.
   - 조건 충족 시 `templates.is_public`을 변경한다.
2. 판매 노출 변경 함수
   - 대상 템플릿·상품과 readiness에 필요한 관계를 일관된 순서로 읽는다.
   - 판매 중지는 조건과 무관하게 허용한다.
   - 판매 시작은 게시·일반 판매·상품·plan·작가·로열티를 같은 트랜잭션에서
     재검증한 뒤 `shop_templates.is_shop_visible`을 변경한다.

애플리케이션의 순수 판정 함수는 목록 표시와 단위 테스트에 계속 사용할 수 있지만,
mutation의 최종 권위는 DB 함수가 가져야 한다. DB 오류 코드는 현재 API 계약인
`SALE_MUST_STOP_FIRST`, `SALE_NOT_READY`, `TEMPLATE_NOT_FOUND`로 변환한다.

## 범위

- 신규 Supabase migration
- `src/services/server/templateHubService.ts`의 두 mutation 함수
- 두 Hub mutation API의 도메인 오류 매핑
- 동시 요청 회귀 테스트

기존 관리 탭의 handler나 원격 DB를 이 작업에서 바로 변경하지 않는다. 로컬 검증
후 원격 migration 적용은 별도 승인을 받는다.

## 완료 조건

- 판매 시작과 맞춤 제작 전환을 동시에 요청해도 불변식 위반 상태가 생기지 않는다.
- 판매 준비 조건이 판정 직후 바뀌어도 부적합한 판매 시작이 성공하지 않는다.
- 판매 중지는 readiness가 깨진 상태에서도 성공한다.
- 기존 API의 HTTP 상태와 오류 코드 계약이 유지된다.
- 같은 요청을 반복해도 최종 상태가 일관적이다.

## 검증

- Promise 기반 동시 요청 테스트를 여러 차례 반복한다.
- 테스트 종료 후 아래 불변식을 직접 집계한다.

```sql
select count(*)
from public.shop_templates st
join public.templates t on t.id = st.template_id
where st.is_shop_visible = true
  and (t.is_public = false or t.status <> 'published');
```

기대 결과는 항상 `0`이다.
