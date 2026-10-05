import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const bg_daedaem = legacyR2ImageSlot("341547cb994e40e8b59d2e21b382f2b200fc467f10c206616cc5c1a4a5b1b73f", 4000, 2250);
const day_daedaem = legacyR2ImageSlot("c698801443f29443de31020320a1ba3e45441befc3c2ab3cf2b10ea3b9148d9e", 303, 392);
const frame_daedaem = legacyR2ImageSlot("7d5f35cba8c0481774b0bee73be7897efa8da4dc875f61f41acb309ef9782929", 4000, 2250);
const offline_daedaem = legacyR2ImageSlot("59e6814c16cbce9d3889019070f8166d8cd7986b65e949396013a5450902d5af", 1141, 425);
const online_daedaem = legacyR2ImageSlot("f2d9fb137b15ea161f5311334cbb7429708dcdc39601d0b4f817ba91225a599d", 1141, 425);
const top_object_daedaem = legacyR2ImageSlot("db8d04a161994858c5f94ec3fee2cc1139f3c06bc556319ee609bc78de6f2a38", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: bg_daedaem,
    day: day_daedaem,
    profile: frame_daedaem,
    offline: offline_daedaem,
    online: online_daedaem,
    topObject: top_object_daedaem,
  },
};
