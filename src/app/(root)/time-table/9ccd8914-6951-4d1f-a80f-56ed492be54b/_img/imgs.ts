import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const Artist = legacyR2ImageSlot("7778e44f38695d6dc1c61992e1c889e785e464a7ea762288f46418386e340ca1", 4000, 2250);
const MainBG = legacyR2ImageSlot("81a4311cb6ccb7343e88c42ed0e47fe37e4ce76842b0be0f43b4b6f52b4077b7", 4000, 2250);

// Online/Offline images
const MemoImg = legacyR2ImageSlot("fa40e7f28ef802547c27d9573e7b6749f0e8f22c2c651ea0a9b5fd9059cc6e10", 800, 617);
const OfflineImg = legacyR2ImageSlot("80f8492a2e12a2d19fcb2e9a2a8ec05b93b01b71861757bfb41d86e486e48622", 800, 617);
const OnlineImg = legacyR2ImageSlot("ce305c29747bb936aae36fb53a1e188be4ce9eb612dcbd171b9c8848b1786bde", 800, 617);
const Online2Img = legacyR2ImageSlot("237eb1acdc095736b1848e567d7d2717e2cd8a645a2a9c0e9e6c61bda3d3dfc8", 800, 617);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("726a95e126c74ae403a38f615e2269a6882bb2f87c5ef72f07a24da6a0a8413d", 4000, 2250);
const TopObject = legacyR2ImageSlot("ba53c61b360e02f74ec106e2dab6bc068d4092cce2f8760ee4c8df808bc8ca76", 4000, 2250);

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
