# 03. 판매 준비 상태와 서버 규칙

상태: 대기  
선행 단계: 02. 읽기 전용 통합 목록

## 1. 목표

템플릿이 판매를 시작할 수 있는지 서버에서 일관되게 판정하고, Hub 목록에 준비
상태와 차단 사유를 제공한다.

클라이언트는 서버 결과를 표시할 뿐 동일한 도메인 규칙을 별도로 재구현하지
않는다.

## 2. 판매 준비 조건

판매 시작에는 다음 조건이 모두 필요하다.

| 조건 | 기준 |
| --- | --- |
| 콘텐츠 게시 | `templates.status === "published"` |
| 일반 판매 | `templates.is_public === true` |
| 상품 존재 | 연결된 `shop_templates` 한 건 존재 |
| 구매 가능 plan | 해당 상품에 유효한 `template_plans` 한 건 이상 |
| 작가 연결 | `template_artists` 한 건 이상 |
| 로열티 | 각 연결 작가에 템플릿 override 또는 작가 기본 규칙 존재 |

엔진은 판매 가능 여부를 결정하지 않는다. Legacy와 Studio에 같은 규칙을 적용한다.

## 3. 차단 사유 계약

```ts
type TemplateSaleBlockReasonCode =
  | "NOT_PUBLISHED"
  | "NOT_GENERAL_SALE"
  | "PRODUCT_MISSING"
  | "PLAN_MISSING"
  | "ARTIST_MISSING"
  | "ROYALTY_MISSING";

type TemplateSaleBlockReason = {
  code: TemplateSaleBlockReasonCode;
  message: string;
  artistIds?: string[];
};
```

응답 예시:

```json
{
  "ready": false,
  "reasons": [
    {
      "code": "PLAN_MISSING",
      "message": "구매 가능한 가격 플랜을 먼저 등록해 주세요."
    }
  ]
}
```

message는 관리자 UI에 직접 표시할 수 있는 한국어 문장으로 제공하되, UI 분기에는
문자열이 아니라 `code`를 사용한다.

## 4. 판정 위치

`src/services/server/templateHubService.ts`에 서버 전용 판정 함수를 둔다.

```ts
evaluateTemplateSaleReadiness(input): TemplateSaleReadiness
```

요구 특성:

- DB client와 UI에 독립적인 순수 계산 부분 분리
- 목록 여러 건을 한 번에 판정할 수 있음
- 단건 mutation 직전에 동일 규칙 재사용 가능
- 누락된 관계를 예외가 아닌 차단 사유로 변환

## 5. 판매 상태 표현

Hub의 표시 상태는 다음 순서로 계산한다.

```text
isShopVisible=true  → 판매 중
ready=true          → 판매 준비 완료
hasProduct=false    → 상품 미구성
그 외               → 판매 불가
```

데이터 이상으로 `isShopVisible=true`이지만 readiness가 false인 경우:

- 판매 중 배지는 유지해 실제 DB 상태를 숨기지 않는다.
- 동시에 "판매 조건 불일치" 경고를 표시한다.
- 판매 중지는 허용한다.
- 자동으로 판매를 재개하거나 데이터를 보정하지 않는다.

## 6. 판매 유형 변경 불변식

`is_public=true → false` 변경은 판매 중인 상태에서 허용하지 않는다.

Hub 전용 mutation API는 다음 순서를 요구한다.

1. `shop_templates.is_shop_visible=false`
2. `templates.is_public=false`

판매 중인 템플릿을 맞춤 제작으로 변경하려 하면 `409`와
`SALE_MUST_STOP_FIRST` 오류를 반환한다. 자동 연쇄 변경보다 운영자의 의도를
명확히 확인하는 방식을 우선한다.

## 7. plan 판정

최소 한 개의 실제 구매 가능한 plan이 필요하다.

- `shop_template_id`가 현재 상품과 일치
- 가격이 null이 아님
- 가격이 0 이상
- 지원하는 plan 종류

무료 판매를 허용하므로 가격 0은 유효하다. plan 종류 제한은 현재 구매 API가
지원하는 값과 일치시킨다.

## 8. 로열티 판정

연결된 각 작가에 대해 다음 우선순위를 적용한다.

1. 현재 템플릿 전용 로열티 규칙
2. 작가 기본 로열티 규칙

둘 다 없으면 `ROYALTY_MISSING`이다. 누락 작가 ID를 응답에 포함해 상품 편집
페이지에서 바로 해결할 수 있게 한다.

## 9. 검증

각 조건을 하나씩 제거한 단위 테스트를 작성한다.

- draft, archived 차단
- 맞춤 제작 차단
- 상품 없음
- plan 없음 또는 잘못된 상품 plan
- 작가 없음
- 일부 작가만 로열티 없음
- 모든 조건 충족
- 조건 불일치 상태에서 판매 중지 가능
- 판매 중 맞춤 제작 전환 거부

기존 파일럿 E2E의 정상 판매 시나리오도 회귀 없이 통과해야 한다.

## 10. 완료 조건

- readiness가 서버 단일 함수에서 계산됨
- 목록과 단건 mutation이 같은 판정을 사용함
- plan과 로열티를 포함한 모든 차단 사유 제공
- 데이터 이상 상태를 숨기지 않음
- 판매 중지는 항상 가능함
- 판매 중 맞춤 제작 전환이 차단됨

