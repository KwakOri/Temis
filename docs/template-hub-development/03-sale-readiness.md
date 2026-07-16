# 03. 판매 준비 상태와 서버 규칙

상태: 완료 (2026-07-16)  
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

01단계에서 목록 응답 계약에 `saleReadiness`가 이미 포함되어 있어, 로열티
판정을 포함한 `evaluateTemplateSaleReadiness`는 01단계 구현 시점에 이미
완전한 형태로 작성되어 있었다. 03단계에서 추가한 것은 6절의 두 불변식을
재사용 가능한 순수 함수로 분리한 것이다.

```ts
evaluateTemplateSalesTypeTransition(input): TemplateSalesTypeTransitionResult
evaluateTemplateSaleVisibilityChange(input): TemplateSaleVisibilityChangeResult
```

두 함수 모두 DB 접근이 없는 순수 함수다. 04단계의 Hub mutation API
(`PATCH .../sales-type`, `PATCH .../sale`)는 이 두 함수를 그대로 호출해
새 판정 로직을 만들지 않는다.

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

### 검증 결과 (2026-07-16)

`npm run check:template-hub:sale-readiness`
(`scripts/check-template-hub-sale-readiness.ts`)에 위 9개 시나리오를 포함해
22건의 단위 테스트를 작성했다. DB나 네트워크 없이 순수 함수만 호출하며
전부 통과했다.

- `evaluateTemplateSaleReadiness`: draft/archived 차단, 맞춤 제작 차단, 상품
  없음(PLAN_MISSING 중복 없음 확인 포함), plan 없음, 작가 없음(ROYALTY_MISSING
  중복 없음 확인 포함), 일부 작가만 로열티 없음(누락 작가 ID·이름이 응답에
  포함되는지 확인), 모든 조건 충족, 여러 사유 동시 발생
- `isPurchasablePlan`: pro/lite 정상, 무료(0원) 허용, 다른 상품의 plan 거부,
  가격 null/음수 거부, 미지원 plan 종류 거부
- `evaluateTemplateSaleVisibilityChange`: 조건 불일치 상태에서도 판매 중지
  항상 허용, ready일 때만 판매 시작 허용, 거부 시 `SALE_NOT_READY`와 전체
  사유 목록 반환
- `evaluateTemplateSalesTypeTransition`: 판매 중 맞춤 제작 전환 거부
  (`SALE_MUST_STOP_FIRST`), 판매 중이 아니면 허용, 일반 판매로의 전환은
  판매 중 여부와 무관하게 항상 허용

`npm run check:pilot-e2e`로 기존 정상 판매 시나리오 회귀 여부를 확인했다 —
통과(로컬 환경에 Gmail 변수가 없어 발생하는 이메일 발송 실패 로그는 이
스크립트가 이미 알려진 것으로 처리하는 무해한 경고이며, 이번 변경과 무관하다).
로컬 복제 DB의 판매 중 템플릿 10건도 여전히 전부 `ready: true`로 평가되어
회귀가 없음을 다시 확인했다. `tsc --noEmit`, 변경 파일 ESLint 통과.

## 10. 완료 조건

- [x] readiness가 서버 단일 함수에서 계산됨
- [x] 목록과 단건 mutation이 같은 판정을 사용함 — mutation은 04단계에서
      구현하되, 재사용할 순수 함수(`evaluateTemplateSaleVisibilityChange`,
      `evaluateTemplateSalesTypeTransition`)는 이번 단계에서 이미 준비됨
- [x] plan과 로열티를 포함한 모든 차단 사유 제공
- [x] 데이터 이상 상태를 숨기지 않음
- [x] 판매 중지는 항상 가능함 (순수 함수 단위 테스트로 확인, 04단계에서
      실제 mutation에 연결)
- [x] 판매 중 맞춤 제작 전환이 차단됨 (순수 함수 단위 테스트로 확인, 04단계에서
      실제 mutation에 연결)

