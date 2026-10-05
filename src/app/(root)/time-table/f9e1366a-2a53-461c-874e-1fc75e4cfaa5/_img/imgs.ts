import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const bg_rudany = legacyR2ImageSlot("b06009c18724e6f35870476224e65d3691ca026d297368f790fbb01d08fa9974", 4000, 2250);
const fullmoontime_rudany = legacyR2ImageSlot("0972bfef600406915fb34d16b29267cbad0cc714ac24ee7f2e42bf8611b99156", 4000, 2250);
const img_rudany = legacyR2ImageSlot("7d3c7fef04c88b7ad3465a30b0c54437ffbd2111834c96c457f1398d37d8b192", 4000, 2250);
const littlemoontime_rudany = legacyR2ImageSlot("082c2326a2ab815f85216b4af0a3fa4cd38f101916a19e820aa8b269b5e1a25f", 4000, 2250);
const offline_rudany = legacyR2ImageSlot("2a16f112dcca47c58fca45e0547ce2b85a0cc19e6eb01eae8bf35d1873a35aa1", 516, 640);
const online_rudany = legacyR2ImageSlot("7c2c3224fa3a82fc609f206b812b1940d678c8b79bf77b5401acbe98ccda66db", 515, 640);
const profile_rudany = legacyR2ImageSlot("e689ec5c84ee16cdc05aeb5fea2bed6ede5e913e7527a928b9908cc8e32d31ad", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: bg_rudany,

    profile: profile_rudany,
    online: online_rudany,
    offline: offline_rudany,
    topObject: fullmoontime_rudany,
    img: img_rudany,
  },
  second: {
    bg: bg_rudany,
    online: online_rudany,
    profile: profile_rudany,
    offline: offline_rudany,
    topObject: littlemoontime_rudany,
    img: img_rudany,
  },
};
