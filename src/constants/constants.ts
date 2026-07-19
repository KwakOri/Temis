// 필수 영역 옵션 (하나만 선택 가능)
export interface RequiredAreaOption {
  value: string;
  label: string;
  price: number;
  description?: string;
}

export const REQUIRED_AREA_OPTIONS: RequiredAreaOption[] = [
  {
    value: "structured",
    label: "정형 시간표",
    price: 80000,
    description: "카드의 형태가 동일하고 정갈하게 배치된 시간표 디자인입니다.",
  },
  {
    value: "extended_area",
    label: "비정형 시간표",
    price: 100000,
    description: "카드의 형태가 자유롭고 개성있게 배치된 시간표 디자인입니다. ",
  },
  {
    value: "team",
    label: "팀 시간표",
    price: 120000,
    description:
      "모든 팀원의 일정을 자동으로 모아서 표시하는 팀 시간표 디자인입니다",
  },
  {
    value: "external_contract",
    label: "외부 계약",
    price: 0,
    description: "외부에서 별도로 계약한 경우 선택해주세요",
  },
];

// 빠른 마감 옵션
export interface FastDeliveryOption {
  value: string;
  label: string;
  description: string;
  multiplier: number; // 가격 배수
}

export const FAST_DELIVERY_OPTION: FastDeliveryOption = {
  value: "fast_delivery_custom",
  label: "빠른 마감",
  description: "1주 이내 제작 완료 (기본 가격의 2배)",
  multiplier: 2,
};

// 기타 옵션
export interface OtherOption {
  value: string;
  label: string;
  price: number;
  description: string;
  is_discount: boolean;
}

export const OTHER_OPTIONS: OtherOption[] = [
  {
    value: "portfolio_private",
    label: "포트폴리오 비공개",
    price: 10000,
    description: "포트폴리오에 공개하지 않습니다",
    is_discount: false,
  },
  {
    value: "review_event",
    label: "후기 이벤트 참여",
    price: 10000,
    description: "SNS에 후기를 작성해주시면 할인됩니다",
    is_discount: true,
  },
];

// 상충하는 기타 옵션 양방향 매핑 ("포트폴리오 비공개" ↔ "후기 이벤트 참여")
export const OTHER_OPTION_CONFLICTS: Record<string, string> = {
  portfolio_private: "review_event",
  review_event: "portfolio_private",
};

// 기존 주문에 한글 라벨로 저장된 기타 옵션을 현재 value로 정규화
const LEGACY_OTHER_OPTION_VALUES: Record<string, string> = {
  "포트폴리오 비공개": "portfolio_private",
  "후기 이벤트 참여": "review_event",
};

export const normalizeOtherOptionValue = (optionValue: string): string =>
  LEGACY_OTHER_OPTION_VALUES[optionValue] ?? optionValue;

// 선택된 옵션 value 목록에 상충 옵션이 함께 포함되어 있는지 판별
export const hasConflictingOtherOptions = (
  selectedOptionValues: string[]
): boolean => {
  const normalizedValues = selectedOptionValues.map(normalizeOtherOptionValue);

  return (
    normalizedValues.includes("portfolio_private") &&
    normalizedValues.includes("review_event")
  );
};
