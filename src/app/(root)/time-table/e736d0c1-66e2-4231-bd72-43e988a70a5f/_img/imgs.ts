import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("ac7b02ab23c2f6b084cf45f908ef7e17f194b607421e783b165761e68bb80c49", 293, 998);
const MainBG = legacyR2ImageSlot("8ffad995d0228ffff01a95441ed7c3fe2cf05ef146fb2d5905cc1bd11f0c97b7", 4000, 2250);
const TopObject = legacyR2ImageSlot("b7d788d421659f90da1b7a24c1c287f84358f5884bc7e49a1a34c327454b27e6", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("80c5accf08b5fe2fb19e970b1c801fc79148923da6d6f56e9f18fdee704676b0", 842, 647);

// Offline images
const OfflineImg = legacyR2ImageSlot("e5abdc3ee94dab23f7c150745e81015482a24152e6ca4fe169fab742c624fb07", 842, 647);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("dace2b17ac8330b0a70ba0f6c1f75c1bae9714f7b97df8b9546091e65ef40225", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
  },
};
