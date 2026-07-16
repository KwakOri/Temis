# 06. 템플릿당 상품 1개 불변식 보장

- 우선순위: P2
- 상태: 미수정
- 영향 영역: 상품 상태, 판매 시작·중지, 목록 count

## 문제

애플리케이션은 한 템플릿에 `shop_templates`가 최대 한 행이라고 가정한다. Hub는
관계 배열의 첫 행만 선택하고, 상품 생성 API는 insert 전에 기존 상품을 조회해
중복을 막는다.

하지만 DB의 `shop_templates.template_id`에는 일반 인덱스만 있고 unique 제약이
없다. 동시에 두 상품 생성 요청이 들어오면 둘 다 "기존 상품 없음"을 확인한 뒤
각각 insert할 수 있다.

중복이 생기면 다음 문제가 발생한다.

- Hub가 정렬 보장 없는 첫 상품만 선택한다.
- 다른 상품이 판매 중이어도 Hub에는 판매 대기로 보일 수 있다.
- 판매 중지 시 선택된 상품만 갱신될 수 있다.
- inner join 기반 count가 템플릿 수보다 커질 수 있다.
- 상품 상세 API의 `.single()`이 실패한다.

현재 로컬 복제 DB에는 중복이 없지만 스키마가 불변식을 보장하지 않는다.

## 수정 방향

`shop_templates.template_id`에 null이 아닌 값 기준 unique index 또는 unique
constraint를 추가한다.

예시:

```sql
create unique index if not exists shop_templates_template_id_unique
  on public.shop_templates(template_id)
  where template_id is not null;
```

적용 전에는 반드시 원격·로컬 데이터를 읽기 전용으로 점검해 중복이 없는지
확인한다. 중복이 있다면 어느 행을 canonical 상품으로 남길지, plan·구매 이력·상점
노출을 어떻게 합칠지 별도 정리 계획이 필요하다.

상품 생성 API는 DB unique violation을 `409`로 변환해 경쟁 요청에서도 현재 사용자
경험을 유지한다. Hub 서버 서비스는 제약이 적용된 뒤 관계 배열의 첫 행을 임의로
고르는 주석과 방어 코드를 단순화할 수 있다.

## 완료 조건

- 하나의 `template_id`로 두 번째 상품을 insert할 수 없다.
- 동시 상품 생성 요청 중 하나만 성공하고 나머지는 `409`를 받는다.
- 기존 상품 수정·plan 연결·판매 시작·중지가 회귀하지 않는다.
- Hub count가 템플릿 단위로 정확하다.
- migration 적용 전 중복 데이터 감사 결과가 기록된다.

## 검증

```sql
select template_id, count(*)
from public.shop_templates
where template_id is not null
group by template_id
having count(*) > 1;
```

migration 전후 모두 결과가 0건이어야 한다. 이후 동일한 `template_id`로 병렬 insert를
시도해 하나만 성공하는지 확인한다. 원격 migration 적용은 사용자 명시 승인 후에만
수행한다.
