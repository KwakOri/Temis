import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const Artist = legacyR2ImageSlot("909f95ce21b00a7fcac7156e0d845f2c88f1850d76a52aba53b6a6cc53c2ac5d", 725, 290);
const MainBG = legacyR2ImageSlot("c1e92af9fd47583f0595885d663bc9e577eeccf1ee1b3a1f75d7bb07b69de83c", 4000, 2250);

// Online/Offline images
const BigOnlineImg = legacyR2ImageSlot("1051766bfe0f2f34130bb1adc1ab49c5a23f0dcba8b1fe957b5a2624743a84bd", 786, 622);
const OfflineImg = legacyR2ImageSlot("df6344a2bcf7148a8a850f0ae73259303d542eadee196ffa2a3d0acfde2ca55a", 786, 622);
const OfflineMemoImg = legacyR2ImageSlot("72bbea80e242b911713d346444e62f08382ec763fa5b313ed0dda51fc25d7239", 786, 622);
const OnlineImg = legacyR2ImageSlot("785bc3b904492d5974c47fa586b772882700a9323a0a32d1b779f2d233db784a", 786, 622);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("82de1377d8fa685f4b5f19782dd45235f8f9e3284be2791dcb1ec2ed61160939", 4000, 2250);
const TopObject = legacyR2ImageSlot("b8b8368ab7dc5a09a355da4d38bc55146b5aa8c32d11566717e4a0f55eeba50c", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    bigOnline: BigOnlineImg,
    offlineMemo: OfflineMemoImg,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    topObject: TopObject,
  },
};
