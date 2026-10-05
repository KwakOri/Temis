import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("85e9707d821b51920231c8c82909ba728f561a29b6a2b90fe0db31def552a794", 4000, 2250);
const MainBG = legacyR2ImageSlot("1c948f0683b815f4f621998dc6b6266b677e2350421922b7a1a16149c06428d9", 4000, 2250);
const TopObject = legacyR2ImageSlot("9801badc51d9b0692bc4fb2afdc9ff2cd09423974f97b580cf8068885e044ff5", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("543a136ff60324fe4d13450d058b5b1a71b2863c6a3bcfb3d1720153ec7834fa", 752, 672);

// Offline images
const OfflineImg = legacyR2ImageSlot("f67f567b82cbe0bcafec308ab61d344cbce27d026e5b43df607d2763edb81d88", 752, 672);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("9ee5a096c5ef7ddb3009eb11349f082860d84312c58e980427cf06da1ab37400", 4000, 2250);

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