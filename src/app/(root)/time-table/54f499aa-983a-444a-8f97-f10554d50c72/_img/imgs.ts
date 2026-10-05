import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("7fa048a850ec9ec52fcf39fe5aa4d16922fbe2614670431d120e74728a12a880", 4000, 2250);
const MainBG = legacyR2ImageSlot("11519305e6cee76f42c6eb526b0fe1eae02c37cd5824706a39bfedf37551291c", 4000, 2250);
const TopObject = legacyR2ImageSlot("3e77281dc58cd1a577b84611a6607f14efcb28b63b07ff2e5cfed87b118fe0a5", 4000, 2250);
const WeekImg = legacyR2ImageSlot("81b5191e054c96db8517c11c0c157d3df53228a17068f6c0a051ef89517eee56", 800, 840);

// Online images
const OnlineBigImg = legacyR2ImageSlot("ee878d089ecab948821cb13a7579d0a02e7ff69c3866310f96cff81375d90412", 800, 840);
const OnlineLongImg = legacyR2ImageSlot("5f571c3dae9073f962e2211a2d68c36b1722c85c87d255ae090c5c1aa1706efa", 1088, 445);

// Offline images
const OfflineBigImg = legacyR2ImageSlot("94ea5ea03f72d215a3f0ae8adcd5f0b50e6867baa10989aea8f215557be188c3", 800, 840);
const OfflineLongImg = legacyR2ImageSlot("664696401bc931897398cf137b549593145b4199a1738ab2666836d3964274c4", 1088, 445);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("f3f39322e252f1f974438c51eae75f58107f3ee9db51ce6dd9e396dbf7a65d6f", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    week: WeekImg,
    offlineBig: OfflineBigImg,
    offlineLong: OfflineLongImg,
    onlineBig: OnlineBigImg,
    onlineLong: OnlineLongImg,
    profileFrame: MainProfileFrame,
  },
};
