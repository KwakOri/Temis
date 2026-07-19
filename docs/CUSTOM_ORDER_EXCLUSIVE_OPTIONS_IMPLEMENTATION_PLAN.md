# Custom Order 상충 옵션 단일 선택 구현 계획

## 1. 문서 정보

- 상태: 구현 예정
- 작성일: 2026-07-19
- 대상 화면: `/custom-order` 주문 폼 3단계 `가격 계산 및 옵션 선택`
- 대상 기능: `후기 이벤트 참여`와 `포트폴리오 비공개`의 상호 배타 선택 및 변경 확인 모달
- 관련 주문 흐름: 신규 주문과 마이페이지의 대기 중 주문 수정

## 2. 배경

맞춤 주문의 기타 옵션에는 다음 두 항목이 있다.

| 옵션명 | 저장 값 | 가격 영향 |
| --- | --- | ---: |
| 포트폴리오 비공개 | `portfolio_private` | +10,000원 |
| 후기 이벤트 참여 | `review_event` | -10,000원 |

`후기 이벤트 참여`는 완성된 결과물을 후기 및 홍보 목적으로 공개할 수 있다는 전제가 있고, `포트폴리오 비공개`는 결과물을 포트폴리오에 공개하지 않는다는 조건이므로 두 옵션은 동시에 성립할 수 없다.

현재는 두 옵션이 모두 일반 체크박스처럼 독립적으로 토글되기 때문에 동시에 선택할 수 있다. 이 경우 사용자에게 상충하는 주문 조건이 노출되고, 두 가격 조정이 서로 상쇄되어 주문 의도를 파악하기 어려워질 수 있다.

## 3. 목표

다음 조건을 만족하도록 주문 옵션 선택 경험과 서버 검증을 변경한다.

1. 신규 주문에서 두 상충 옵션이 동시에 선택된 상태가 만들어지지 않아야 한다.
2. 한 옵션이 선택된 상태에서 반대 옵션을 선택하면 즉시 교체하지 않고 확인 모달을 표시해야 한다.
3. 모달은 새로 선택할 옵션과 선택 해제될 옵션의 이름을 모두 명확히 표시해야 한다.
4. 사용자가 `변경하기`를 누른 경우에만 기존 옵션을 해제하고 새 옵션을 선택해야 한다.
5. 사용자가 `취소`하면 기존 선택과 계산 금액이 그대로 유지되어야 한다.
6. 신규 주문과 주문 수정 API는 상충 옵션이 함께 전달되는 요청을 저장하지 않아야 한다.
7. 이미 두 옵션이 함께 저장된 과거 주문을 수정할 때 사용자가 명시적으로 충돌을 해소할 수 있어야 한다.

## 4. 범위

### 4.1 포함 범위

- 기타 옵션 선택 핸들러에 상호 배타 규칙 적용
- 선택 변경을 확인하는 전용 모달 추가
- 모달 문구를 선택 방향에 따라 동적으로 생성
- 확인 시 기존 옵션 해제와 신규 옵션 선택을 하나의 상태 업데이트로 처리
- 취소 시 옵션 상태와 가격 유지
- 과거 상충 주문의 수정 단계 진행 방지 및 해소 안내
- 주문 생성 `POST`와 주문 수정 `PUT` API에 동일한 상충 검증 추가
- 키보드 및 스크린 리더를 고려한 기본 모달 접근성 처리
- 빌드, 린트 및 수동 회귀 검증

### 4.2 제외 범위

- 옵션 가격 또는 할인 금액 변경
- 빠른 마감 가격 배수 계산 방식 변경
- 다른 선택 옵션의 다중 선택 방식 변경
- `OptionCard` 전체 구조 또는 디자인 리팩터링
- 주문 폼의 단계 구성 변경
- `selected_options` DB 컬럼 구조 변경
- 기존 운영 데이터의 자동 수정 또는 삭제
- 클라이언트가 전달하는 `priceQuoted` 전체를 서버에서 재계산하도록 변경하는 작업

## 5. 현재 구현 분석

### 5.1 옵션 정의

`src/constants/constants.ts`의 `OTHER_OPTIONS`에 두 옵션이 정적 옵션으로 정의되어 있다.

- `portfolio_private`
- `review_event`

두 옵션은 DB 가격 옵션 목록에서 제외되고, 주문 화면의 `기타 옵션` 영역에서 렌더링된다.

### 5.2 클라이언트 선택 상태

`src/components/shop/CustomOrderForm.tsx`의 `Step3Data.selectedOptions`가 다음 형태로 선택 여부를 관리한다.

```ts
Record<string, boolean>
```

현재 `OTHER_OPTIONS.map()` 내부에서는 클릭한 옵션의 boolean 값만 반전한다. 반대 옵션의 상태를 확인하지 않으므로 다음 상태가 허용된다.

```ts
{
  portfolio_private: true,
  review_event: true,
}
```

### 5.3 가격 계산

같은 컴포넌트의 가격 계산 `useEffect`는 `selectedOptions`에서 값이 `true`인 모든 옵션을 합산한다.

- `portfolio_private`: 총액에 10,000원 추가
- `review_event`: 총액에서 10,000원 차감
- `fastDelivery`가 선택된 경우 옵션 계산 후 전체 금액에 기존 배수를 적용

상충 옵션 교체는 `selectedOptions`를 원자적으로 갱신하고, 기존 가격 계산 로직이 새 상태를 기준으로 다시 실행되도록 한다. 가격 계산식 자체는 수정하지 않는다.

### 5.4 주문 수정 초기값

`getInitialSelectedOptions()`는 기존 주문의 `selected_options` 배열을 그대로 boolean 맵으로 복원한다. 따라서 과거에 두 상충 옵션이 함께 저장된 주문은 수정 화면에서도 두 옵션이 모두 선택된 상태로 열릴 수 있다.

### 5.5 API 저장

`src/app/api/shop/custom-order/route.ts`의 `POST`와 `PUT`은 `selectedOptions`에서 truthy 값의 key를 추출하여 `selected_options` JSONB 배열에 저장한다. 현재 상충 조합을 거절하는 검증은 없다.

## 6. 확정된 UX 규칙

### 6.1 일반 선택 및 해제

- 두 옵션이 모두 미선택인 상태에서 하나를 누르면 모달 없이 즉시 선택한다.
- 선택된 옵션을 다시 누르면 모달 없이 즉시 선택 해제한다.
- 상충하지 않는 다른 옵션의 선택 상태는 변경하지 않는다.
- 외부 계약이 선택되어 기타 옵션이 비활성화된 경우 기존 비활성화 동작을 유지한다.

### 6.2 상충 옵션 변경

한 옵션이 선택된 상태에서 반대 옵션을 누르면 다음 순서로 처리한다.

1. 현재 옵션 상태는 변경하지 않는다.
2. 요청한 옵션과 현재 선택된 상충 옵션을 `pendingOptionChange`에 보관한다.
3. 확인 모달을 연다.
4. `취소` 시 pending 상태만 비우고 기존 선택을 유지한다.
5. `변경하기` 시 기존 옵션을 `false`, 새 옵션을 `true`로 한 번에 갱신한다.
6. pending 상태를 비우고 모달을 닫는다.
7. 가격 계산은 확정된 새 선택 상태를 기준으로 자동 실행한다.

### 6.3 모달 문구

모달 제목은 `옵션 변경 확인`으로 한다.

#### 후기 이벤트 참여로 변경할 때

> "후기 이벤트 참여"를 선택하면 포트폴리오 비공개 옵션은 선택할 수 없습니다.
>
> "포트폴리오 비공개" 선택을 해제하고 변경하시겠습니까?

#### 포트폴리오 비공개로 변경할 때

> "포트폴리오 비공개"를 선택하면 후기 이벤트 참여 옵션은 선택할 수 없습니다.
>
> "후기 이벤트 참여" 선택을 해제하고 변경하시겠습니까?

버튼은 다음 순서로 제공한다.

- 보조 버튼: `취소`
- 주요 버튼: `변경하기`

옵션명은 모달 JSX에 별도로 하드코딩하지 않고 `OTHER_OPTIONS`에서 조회한 label을 사용한다. 이를 통해 화면 카드와 모달의 옵션명이 달라지는 문제를 방지한다.

### 6.4 모달을 닫는 동작

다음 동작은 모두 `취소`와 동일하게 처리하며 옵션 상태를 변경하지 않는다.

- `취소` 버튼 클릭
- `Escape` 키 입력
- 모달 배경 클릭

`변경하기` 버튼을 눌렀을 때만 선택을 교체한다.

## 7. 상태 전이 명세

`P`는 `portfolio_private`, `R`은 `review_event`를 의미한다.

| 기존 P | 기존 R | 사용자 동작 | 모달 | 취소 결과 | 변경하기 결과 |
| ---: | ---: | --- | --- | --- | --- |
| false | false | P 선택 | 없음 | 해당 없음 | P=true, R=false |
| false | false | R 선택 | 없음 | 해당 없음 | P=false, R=true |
| true | false | P 재선택 | 없음 | 해당 없음 | P=false, R=false |
| false | true | R 재선택 | 없음 | 해당 없음 | P=false, R=false |
| true | false | R 선택 | 표시 | P=true, R=false | P=false, R=true |
| false | true | P 선택 | 표시 | P=false, R=true | P=true, R=false |
| true | true | P 재선택 | 없음 | 해당 없음 | P=false, R=true |
| true | true | R 재선택 | 없음 | 해당 없음 | P=true, R=false |

마지막 두 행은 과거에 상충 옵션이 함께 저장된 수정 주문을 사용자가 직접 정상 상태로 되돌리는 경우다.

## 8. 상세 구현 설계

### 8.1 상충 규칙을 공통 상수로 정의

대상 파일: `src/constants/constants.ts`

두 옵션의 관계를 한쪽 방향만 비교하지 않도록 양방향 매핑으로 정의한다.

예상 형태:

```ts
export const OTHER_OPTION_CONFLICTS = {
  portfolio_private: "review_event",
  review_event: "portfolio_private",
} as const;
```

함께 선택되었는지 판별하는 작은 순수 함수도 같은 모듈에 두거나, 동일 상수를 사용하는 별도 유틸리티로 분리한다.

```ts
export const normalizeOtherOptionValue = (optionValue: string): string =>
  LEGACY_OTHER_OPTION_VALUES[optionValue] ?? optionValue;

export const hasConflictingOtherOptions = (
  selectedOptionValues: string[]
): boolean => {
  const normalizedValues = selectedOptionValues.map(normalizeOtherOptionValue);

  return (
    normalizedValues.includes("portfolio_private") &&
    normalizedValues.includes("review_event")
  );
};
```

원칙:

- 클라이언트와 API가 동일한 option value를 사용한다.
- 과거 주문의 한글 옵션명은 충돌 검사 전에 현재 영어 value로 정규화한다.
- 옵션명은 `OTHER_OPTIONS`의 label에서 얻는다.
- 클라이언트와 API에 상충 key 문자열을 각각 중복 선언하지 않는다.

### 8.2 pending 변경 상태 추가

대상 파일: `src/components/shop/CustomOrderForm.tsx`

예상 상태 타입:

```ts
interface PendingOptionChange {
  requestedValue: string;
  conflictingValue: string;
}
```

예상 React 상태:

```ts
const [pendingOptionChange, setPendingOptionChange] =
  useState<PendingOptionChange | null>(null);
```

이 상태는 실제 선택 상태와 분리한다. 모달을 여는 순간에는 `step3Data.selectedOptions`를 수정하지 않아야 하며, 따라서 모달이 열린 동안 카드 선택 표시와 총 결제 금액도 기존 값을 유지한다.

### 8.3 기타 옵션 공통 클릭 핸들러 추가

대상 파일: `src/components/shop/CustomOrderForm.tsx`

`OTHER_OPTIONS.map()` 안의 인라인 토글을 `handleOtherOptionClick`로 교체한다.

처리 순서 의사 코드는 다음과 같다.

```ts
const handleOtherOptionClick = (optionValue: string) => {
  if (step3Data.externalContract) return;

  const isSelected = !!step3Data.selectedOptions[optionValue];

  if (isSelected) {
    // 본인을 다시 누르면 즉시 선택 해제
    updateSelectedOption(optionValue, false);
    return;
  }

  const conflictingValue = OTHER_OPTION_CONFLICTS[optionValue];
  const hasSelectedConflict =
    conflictingValue && step3Data.selectedOptions[conflictingValue];

  if (hasSelectedConflict) {
    // 실제 옵션 상태는 변경하지 않고 확인을 보류
    setPendingOptionChange({
      requestedValue: optionValue,
      conflictingValue,
    });
    return;
  }

  updateSelectedOption(optionValue, true);
};
```

타입상 상충 매핑에 존재하지 않는 다른 기타 옵션이 추가되더라도 기존처럼 독립 선택할 수 있어야 한다.

### 8.4 변경 확인 및 취소 핸들러

대상 파일: `src/components/shop/CustomOrderForm.tsx`

확인 시에는 함수형 state update를 사용한다.

```ts
const handleConfirmOptionChange = () => {
  if (!pendingOptionChange) return;

  const { requestedValue, conflictingValue } = pendingOptionChange;

  setStep3Data((prev) => ({
    ...prev,
    selectedOptions: {
      ...prev.selectedOptions,
      [conflictingValue]: false,
      [requestedValue]: true,
    },
  }));

  setPendingOptionChange(null);
};
```

취소 시에는 `setPendingOptionChange(null)`만 실행한다.

이 방식은 다음을 보장한다.

- 기존 옵션 해제와 새 옵션 선택 사이에 양쪽이 모두 false이거나 true인 중간 렌더가 발생하지 않는다.
- 모달을 취소해도 가격 계산 effect가 다시 실행되지 않는다.
- 다른 선택 옵션의 boolean 값이 보존된다.

### 8.5 전용 확인 모달 컴포넌트 추가

신규 파일 제안: `src/components/shop/CustomOrderOptionConflictModal.tsx`

예상 props:

```ts
interface CustomOrderOptionConflictModalProps {
  requestedOptionLabel: string;
  conflictingOptionLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}
```

표시 조건은 `pendingOptionChange !== null`이다. label 조회에 실패하면 모달을 열지 않고 안전하게 기존 선택 상태를 유지하거나, 개발 중 확인 가능한 오류를 기록한다.

스타일 및 레이어 규칙:

- 기존 주문 폼이 `z-50`이므로 확인 모달은 `z-[60]` 이상을 사용한다.
- 모바일에서는 좌우 여백을 유지하고, 긴 옵션명에도 내용이 잘리지 않아야 한다.
- 기존 Tailwind 색상 토큰과 버튼 스타일을 재사용한다.
- 네이티브 `window.confirm` 대신 프로젝트 화면 안에서 렌더링되는 모달을 사용한다.

폼 안전 규칙:

- 모달이 3단계 `<form>` 하위에서 렌더링될 수 있으므로 모든 모달 버튼에 `type="button"`을 명시한다.
- 모달 버튼 클릭이 `handleStep3Submit`을 실행하지 않아야 한다.

### 8.6 모달 접근성

모달에는 최소한 다음 속성과 동작을 적용한다.

- 컨테이너에 `role="dialog"`
- 컨테이너에 `aria-modal="true"`
- 제목에 고유 id를 부여하고 `aria-labelledby`로 연결
- 설명에 고유 id를 부여하고 `aria-describedby`로 연결
- 모달이 열리면 안전한 기본 동작인 `취소` 버튼에 초기 포커스
- `Escape` 입력 시 취소
- 모달이 열린 동안 `Tab` 포커스가 모달 버튼 밖으로 빠져나가지 않도록 처리
- 배경 클릭 시 취소하되 모달 내부 클릭은 전파 방지
- 모달이 닫힌 뒤 가능한 범위에서 옵션 선택 흐름으로 포커스 복원

프로젝트에 공통 dialog 라이브러리가 없으므로 새 의존성은 추가하지 않고 작은 로컬 구현으로 처리한다.

### 8.7 과거 상충 주문 처리

대상 파일: `src/components/shop/CustomOrderForm.tsx`

초기 복원 과정에서 둘 중 하나를 임의로 해제하지 않는다. 어느 옵션이 실제 사용자 의도였는지 코드가 판단할 수 없기 때문이다.

대신 다음 규칙을 적용한다.

1. 초기 복원 시 한글 옵션명을 현재 영어 value로 정규화한다.
2. `selectedOptions`에서 두 상충 옵션이 모두 true인지 파생 값으로 계산한다.
3. 충돌 상태이면 기타 옵션 영역에 다음 안내를 표시한다.

   > 상충하는 옵션이 함께 선택되어 있습니다. "후기 이벤트 참여"와 "포트폴리오 비공개" 중 하나를 선택 해제해주세요.

4. `handleStep3Submit`에서 충돌 여부를 다시 확인한다.
5. 충돌 상태이면 4단계로 이동하지 않고 옵션 영역에 머문다.
6. 사용자가 선택된 옵션 중 하나를 누르면 해당 옵션만 즉시 해제되어 정상 상태가 된다.
7. 정상 상태가 되면 안내가 사라지고 다음 단계로 진행할 수 있다.

이 처리는 신규 주문의 정상 동작에는 노출되지 않는 방어 로직이다.

### 8.8 API 검증 추가

대상 파일: `src/app/api/shop/custom-order/route.ts`

`POST`와 `PUT` 모두 전달된 한글 옵션명을 영어 value로 정규화하고, 필수 영역·빠른 마감·외부 계약을 모두 추가한 최종 `selectedOptionValues`를 DB 저장 전에 검증한다.

```ts
if (hasConflictingOtherOptions(selectedOptionValues)) {
  return NextResponse.json(
    {
      error:
        '"후기 이벤트 참여"와 "포트폴리오 비공개" 옵션은 함께 선택할 수 없습니다.',
    },
    { status: 400 }
  );
}
```

검증 위치는 다음 조건을 만족해야 한다.

- Supabase insert 또는 update 전에 실행
- 최종 저장 배열 구성이 끝난 뒤 실행
- 신규 주문과 수정 주문에 모두 적용
- 파일 연결 작업 전에 실행
- 잘못된 조합에서는 DB와 파일 관계를 변경하지 않음

API는 두 옵션 중 하나를 임의로 제거하지 않고 요청 자체를 거절한다. API 요청에는 사용자가 마지막으로 선택한 옵션의 순서 정보가 없으므로 서버가 임의로 우선순위를 정하면 안 된다.

### 8.9 DB 변경 여부

`selected_options`는 JSONB 배열이며 이번 요구사항은 애플리케이션 선택 규칙에 해당한다. 이번 구현에서는 DB 마이그레이션이나 CHECK 제약조건을 추가하지 않는다.

이유:

- 기존 상충 데이터가 존재할 경우 제약조건 적용 전에 별도 정리가 필요하다.
- 현재 쓰기 경로의 POST와 PUT 검증으로 신규 상충 데이터 저장을 차단할 수 있다.
- 자동 데이터 정리는 실제 주문 의도를 판단할 수 없어 위험하다.

추후 DB 수준 제약이 필요하면 운영 데이터 감사와 정리 정책을 별도 작업으로 진행한다.

## 9. 변경 예상 파일

| 파일 | 변경 내용 |
| --- | --- |
| `src/constants/constants.ts` | 상충 옵션 양방향 매핑, 한글 옵션 정규화 및 공통 판별 규칙 추가 |
| `src/components/shop/CustomOrderForm.tsx` | pending 상태, 공통 클릭 핸들러, 확인·취소 처리, 과거 옵션 정규화 및 상충 주문 진행 방지, 모달 연결 |
| `src/components/shop/CustomOrderOptionConflictModal.tsx` | 동적 문구, 버튼, 레이어 및 접근성 동작을 포함한 전용 모달 추가 |
| `src/app/api/shop/custom-order/route.ts` | POST와 PUT 입력 정규화 및 최종 옵션 배열의 상충 조합 400 검증 추가 |

변경이 필요하지 않은 파일:

- `src/types/customOrder.ts`: 기존 `selectedOptions` 자료형을 그대로 사용 가능
- `src/services/customOrderService.ts`: API 계약의 성공 응답 구조가 바뀌지 않음
- `src/hooks/query/useCustomOrder.ts`: mutation 및 캐시 무효화 전략 변경 없음
- Supabase 마이그레이션 및 생성 타입: 스키마 변경 없음

## 10. 구현 순서

### 1단계: 공통 규칙 정의

- 상충 옵션 key를 양방향 매핑으로 정의한다.
- 선택 값 배열의 충돌 여부를 검사하는 순수 함수를 추가한다.
- `OTHER_OPTIONS`의 기존 key 및 label과 일치하는지 확인한다.

### 2단계: 클라이언트 상태 전이 구현

- `pendingOptionChange` 상태를 추가한다.
- 단일 옵션 업데이트 helper를 만든다.
- 기타 옵션 인라인 토글을 공통 클릭 핸들러로 교체한다.
- 확인과 취소 핸들러를 추가한다.

### 3단계: 확인 모달 구현

- 전용 모달 컴포넌트를 추가한다.
- 요청 옵션과 해제 옵션 label로 문구를 생성한다.
- 버튼 타입, z-index, Escape, 배경 클릭, 초기 포커스를 처리한다.
- `CustomOrderForm`에 조건부 렌더링한다.

### 4단계: 수정 주문 방어

- 두 옵션이 모두 true인 파생 상태를 계산한다.
- 충돌 안내를 렌더링한다.
- 충돌이 해결될 때까지 3단계 제출을 차단한다.

### 5단계: API 방어

- POST의 선택 옵션 추출 직후 충돌 검증을 추가한다.
- PUT의 선택 옵션 추출 직후 같은 검증을 추가한다.
- 오류 상태와 메시지를 통일한다.

### 6단계: 검증 및 회귀 확인

- 정적 검사와 프로덕션 빌드를 실행한다.
- 신규 주문과 수정 주문의 상태 전이 시나리오를 수동 검증한다.
- API가 상충 요청을 저장하지 않는지 확인한다.

## 11. 검증 계획

### 11.1 정적 검증

프로젝트 루트에서 다음 명령을 실행한다.

```bash
npm run lint
npm run build
```

검증 기준:

- TypeScript 타입 오류 없음
- ESLint 신규 오류 없음
- Next.js 프로덕션 빌드 성공
- 기존 주문 폼과 API route의 import 경계 오류 없음

프로젝트 환경 또는 기존 문제 때문에 명령이 실패하면 이번 변경으로 발생한 실패인지 분리하여 기록한다.

### 11.2 신규 주문 수동 검증

- [ ] 두 옵션이 모두 미선택인 초기 상태가 정상 표시된다.
- [ ] `후기 이벤트 참여`만 선택할 수 있다.
- [ ] `포트폴리오 비공개`만 선택할 수 있다.
- [ ] 선택된 옵션을 다시 누르면 모달 없이 해제된다.
- [ ] 후기 이벤트 참여가 선택된 상태에서 포트폴리오 비공개를 누르면 모달이 열린다.
- [ ] 포트폴리오 비공개가 선택된 상태에서 후기 이벤트 참여를 누르면 모달이 열린다.
- [ ] 모달에 두 옵션명이 올바른 위치에 표시된다.
- [ ] `취소` 후 기존 옵션만 선택되어 있다.
- [ ] `Escape` 후 기존 옵션만 선택되어 있다.
- [ ] 배경 클릭 후 기존 옵션만 선택되어 있다.
- [ ] `변경하기` 후 기존 옵션은 해제되고 새 옵션만 선택되어 있다.
- [ ] 모달을 여는 것만으로 가격이 바뀌지 않는다.
- [ ] `변경하기` 후 기존 가격 공식에 따라 금액이 갱신된다.
- [ ] 빠른 마감이 선택된 상태에서도 기존 배수 규칙으로 금액이 계산된다.
- [ ] 다른 선택 영역 옵션은 교체 전후 그대로 유지된다.
- [ ] 외부 계약 선택 시 기존처럼 기타 옵션이 비활성화된다.
- [ ] 옵션 변경 후 4단계에 표시되는 결제 금액이 3단계와 일치한다.
- [ ] 최종 저장 데이터에는 상충 옵션 중 하나만 포함된다.

### 11.3 수정 주문 수동 검증

- [ ] 정상적인 기존 주문은 저장된 단일 옵션을 그대로 복원한다.
- [ ] 단일 옵션에서 반대 옵션으로 변경할 때 신규 주문과 같은 모달이 열린다.
- [ ] 변경을 취소하면 저장되어 있던 기존 선택을 유지한다.
- [ ] 변경을 확인하고 수정 완료하면 새 옵션만 저장된다.
- [ ] 두 상충 옵션이 함께 저장된 과거 주문은 충돌 안내를 표시한다.
- [ ] 과거 상충 주문은 둘 중 하나를 해제하기 전까지 4단계로 이동할 수 없다.
- [ ] 충돌 해소 후 수정 완료하면 하나의 옵션만 저장된다.

### 11.4 접근성 및 키보드 검증

- [ ] `OptionCard`에 포커스한 뒤 Enter 또는 Space로 같은 선택 흐름을 시작할 수 있다.
- [ ] 모달이 열리면 `취소` 버튼으로 포커스가 이동한다.
- [ ] Tab과 Shift+Tab이 모달 내부에서 순환한다.
- [ ] Escape로 모달을 닫을 수 있다.
- [ ] 모달의 제목과 설명이 dialog의 ARIA 속성에 연결된다.
- [ ] `취소`와 `변경하기` 버튼이 폼 제출을 발생시키지 않는다.

### 11.5 API 검증

POST와 PUT에 대해 다음 조합을 각각 확인한다.

| 전달 조합 | 기대 결과 |
| --- | --- |
| 두 옵션 모두 false 또는 누락 | 기존 검증 및 저장 흐름 유지 |
| `portfolio_private`만 true | 정상 처리 |
| `review_event`만 true | 정상 처리 |
| 두 옵션 모두 true | HTTP 400, DB 변경 없음 |

오류 응답 기대값:

```json
{
  "error": "\"후기 이벤트 참여\"와 \"포트폴리오 비공개\" 옵션은 함께 선택할 수 없습니다."
}
```

## 12. 과거 데이터 감사 계획

구현 자체는 운영 DB를 변경하지 않는다. 필요할 경우 별도 승인된 읽기 전용 점검으로 다음 조건의 주문 수만 확인한다.

```sql
SELECT id, status, created_at, selected_options
FROM public.custom_timetable_orders
WHERE selected_options @> '["portfolio_private", "review_event"]'::jsonb
ORDER BY created_at DESC;
```

감사 결과에 상충 주문이 존재하더라도 자동으로 하나를 제거하지 않는다. 고객 주문 조건을 확인한 뒤 관리자 또는 고객이 수정 흐름에서 명시적으로 선택하도록 한다.

운영 데이터 조회나 수정은 이 구현 계획의 실행 범위에 포함하지 않으며, 필요한 경우 프로젝트의 Supabase 원격 작업 규칙에 따라 별도 승인을 받아 진행한다.

## 13. 위험 요소와 대응

### 13.1 모달 버튼이 폼을 제출하는 문제

- 위험: `<button>`의 기본 타입이 submit이어서 모달 확인과 동시에 4단계로 이동할 수 있다.
- 대응: 모든 모달 버튼에 `type="button"`을 명시하고 회귀 시나리오로 확인한다.

### 13.2 확인 전에 가격이 변경되는 문제

- 위험: 모달을 열기 전에 새 옵션 상태를 반영하면 취소해도 가격이 잠시 또는 영구적으로 바뀔 수 있다.
- 대응: 클릭 시 pending 상태만 저장하고 실제 `selectedOptions`는 확인 시점에만 변경한다.

### 13.3 기존 옵션과 신규 옵션이 동시에 남는 문제

- 위험: 확인 핸들러가 새 옵션만 true로 변경하면 기존 옵션이 남는다.
- 대응: 함수형 state update 하나에서 기존 false와 신규 true를 동시에 설정한다.

### 13.4 API 경로별 규칙 불일치

- 위험: POST에만 검증하거나 PUT에만 검증하면 다른 경로에서 상충 데이터가 저장된다.
- 대응: 공통 판별 함수를 사용하고 POST 및 PUT 테스트 항목을 분리한다.

### 13.5 과거 데이터의 임의 정리

- 위험: 초기값 복원 시 특정 옵션을 우선하면 실제 고객 의도가 소실될 수 있다.
- 대응: 자동 정리하지 않고 수정 화면에서 충돌을 표시하여 명시적으로 해소하도록 한다.

### 13.6 모달 레이어 충돌

- 위험: 주문 폼 자체가 fixed `z-50`이므로 동일하거나 낮은 z-index의 모달이 뒤에 가려질 수 있다.
- 대응: 확인 모달에 `z-[60]` 이상의 명시적 레이어를 적용한다.

### 13.7 옵션 label과 규칙 key 불일치

- 위험: 문구를 별도로 하드코딩하면 옵션명 변경 시 카드와 모달의 표시가 달라질 수 있다.
- 대응: 상충 규칙은 value로 처리하고 사용자 문구는 `OTHER_OPTIONS`의 label로 생성한다.

## 14. 롤백 계획

이번 작업은 DB 마이그레이션을 포함하지 않으므로 코드 롤백만 필요하다.

롤백 순서:

1. `CustomOrderForm`의 pending 상태와 상충 클릭 핸들러를 제거하고 기존 토글로 복원한다.
2. 전용 확인 모달 렌더링과 신규 모달 파일을 제거한다.
3. POST 및 PUT의 상충 검증을 제거한다.
4. 상충 옵션 공통 상수와 판별 함수를 제거한다.
5. 린트와 빌드를 다시 실행한다.

데이터 스키마나 기존 주문 데이터는 변경하지 않으므로 별도 DB 롤백은 없다.

## 15. 완료 조건

다음 항목을 모두 만족하면 구현 완료로 판단한다.

- [ ] 일반 UI 조작으로 두 상충 옵션이 동시에 선택될 수 없다.
- [ ] 양방향 전환 시 확정된 동적 문구의 확인 모달이 표시된다.
- [ ] 취소 계열 동작은 기존 옵션과 가격을 유지한다.
- [ ] 변경하기는 기존 옵션을 해제하고 새 옵션 하나만 남긴다.
- [ ] 다른 옵션, 빠른 마감, 외부 계약 동작에 회귀가 없다.
- [ ] 과거 상충 주문은 명시적인 충돌 해소 전까지 다음 단계로 진행할 수 없다.
- [ ] POST와 PUT은 상충 옵션 요청을 HTTP 400으로 거절한다.
- [ ] DB 마이그레이션 없이 동작한다.
- [ ] 린트 및 프로덕션 빌드 결과가 기록되어 있다.
- [ ] 신규 주문과 수정 주문의 수동 검증 체크리스트가 완료되어 있다.
