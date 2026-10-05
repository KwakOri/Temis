import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const Artist = legacyR2ImageSlot("d4e01cfc2f00fc56452b7872b407e1971ed30d2f7eda2266d26731c9eeef2d77", 4000, 2250);
const MainBG = legacyR2ImageSlot("0419f99ba65d593835ee5defc10b1754c1295090592d4da0b77665c7cf33b0d6", 4000, 2250);

// Online/Offline images
const MemoImg = legacyR2ImageSlot("9a2cf548a8487540f747e4c680e005a6493c6c44eff241efdb903f363355a799", 800, 617);
const OfflineImg = legacyR2ImageSlot("91594aef2ac0d66a8f10bd61f59d1b61d58ba54e92cac8f863effbb75cff33e7", 800, 617);
const OnlineImg = legacyR2ImageSlot("4cb89861187bff7082904b184e52607e74ae1c2baffc57af4e3b1520214fcefc", 800, 617);
const Online2Img = legacyR2ImageSlot("b3d29e9e74821e8fe26309bde6539ffadd0ae6bfc019eaaea4a964c7413286ef", 800, 617);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("93e04ac73f96662641d31c83c83d1b2313f20c57a119b2852484b0b0d5a03b33", 4000, 2250);
const TopObject = legacyR2ImageSlot("3b605cdf9dbd5ec6ed2f10c30a09c03afb1462eec1a90952b2ea277feecf81dd", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    bigOnline: Online2Img,
    memo: MemoImg,
    profileFrame: MainProfileFrame,
    topObject: TopObject,
  },
};
