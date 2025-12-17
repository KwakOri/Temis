import { PriceOption } from "@/types/priceOption";
import {
  REQUIRED_AREA_OPTIONS,
  OTHER_OPTIONS,
  FAST_DELIVERY_OPTION,
} from "@/constants/constants";

// 한글 라벨 -> 영어 value 매핑 (기존 데이터 호환용)
const LEGACY_LABEL_TO_VALUE: Record<string, string> = {
  "기본 제작비": "base_price",
  "빠른 마감": "fast_delivery",
  "포트폴리오 비공개": "portfolio_private",
  "후기 이벤트 참여": "review_event",
  "외부 계약": "external_contract",
};

// 영어 value -> 한글 라벨 매핑 (새로운 데이터 표시용)
// constants.ts의 옵션들을 포함
const VALUE_TO_LABEL: Record<string, string> = {
  base_price: "기본 제작비",
  fast_delivery: "빠른 마감",
  portfolio_private: "포트폴리오 비공개",
  review_event: "후기 이벤트 참여",
  external_contract: "외부 계약",
  // REQUIRED_AREA_OPTIONS
  structured: "정형 시간표",
  extended_area: "비정형 시간표",
  team: "팀 시간표",
  // FAST_DELIVERY_OPTION
  fast_delivery_custom: "빠른 마감",
};

/**
 * 옵션 value 또는 label을 표시용 label로 변환
 *
 * 1. 먼저 기존 한글 라벨인지 확인 (하위 호환성)
 * 2. 영어 value인 경우 한글 라벨로 변환
 * 3. priceOptions에서 동적으로 매핑 확인
 * 4. 매칭되지 않으면 원본 그대로 반환
 */
export function getOptionDisplayLabel(
  optionValue: string,
  priceOptions?: PriceOption[]
): string {
  // 1. 기존 한글 라벨인지 확인 (하위 호환성)
  if (LEGACY_LABEL_TO_VALUE[optionValue]) {
    return optionValue; // 이미 한글 라벨이면 그대로 반환
  }

  // 2. 정적 매핑에서 영어 value -> 한글 라벨 변환
  if (VALUE_TO_LABEL[optionValue]) {
    return VALUE_TO_LABEL[optionValue];
  }

  // 3. priceOptions에서 동적으로 매핑 확인
  if (priceOptions) {
    // 먼저 label로 일치하는지 확인 (기존 한글 데이터)
    const matchByLabel = priceOptions.find((opt) => opt.label === optionValue);
    if (matchByLabel) {
      return matchByLabel.label;
    }

    // value로 일치하는지 확인 (새로운 영어 데이터)
    const matchByValue = priceOptions.find((opt) => opt.value === optionValue);
    if (matchByValue) {
      return matchByValue.label;
    }
  }

  // 4. 매칭되지 않으면 원본 그대로 반환
  return optionValue;
}

/**
 * 옵션 배열을 표시용 라벨 배열로 변환
 */
export function getOptionDisplayLabels(
  options: string[],
  priceOptions?: PriceOption[]
): string[] {
  return options.map((opt) => getOptionDisplayLabel(opt, priceOptions));
}
