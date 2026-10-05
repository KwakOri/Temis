import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
// import ArtistImg from "./main/artist.png";
const MainBG = legacyR2ImageSlot("97b47044cc1feb29d346ef13be7924b66ed5a2c241f4884e4e50d9027adf6b14", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("a103a88bc91780f56f6bd2119da144f42598f2b31d31ce3b94cf3615c3642f04", 619, 705);

// Offline images
const OfflineImg = legacyR2ImageSlot("fc29ecb448f1909c96ed47b548785b39e4ae88c2a9021bfd89bf886b515a02a1", 619, 705);

const OfflineMemoImg = legacyR2ImageSlot("45c1ad4b5c07742683543cb8620ff240dc8ffd20612bc9a69b4a052798048b4e", 619, 705);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("d2a0ca31b090d21d742674781c0e22dd5947e49c59b7b6a5689fe616a4862d99", 4000, 2250);

const MemoImg = legacyR2ImageSlot("7283404e3039dec38c96ab0577ebdbe507e0ac163d25f563b239a1cc7539acef", 619, 705);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    offline: OfflineImg,
    offlineMemo: OfflineMemoImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    memo: MemoImg,
  },
};
