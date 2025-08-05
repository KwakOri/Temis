import { TPlaceholders } from "@/types/time-table/data";
import { getPlaceholders } from "@/utils/time-table/data";
import { CARD_INPUT_CONFIG, profileTextPlaceholder } from "./settings";

export const placeholders: TPlaceholders = getPlaceholders({
  cardInputConfig: CARD_INPUT_CONFIG,
  profilePlaceholder: profileTextPlaceholder,
});
