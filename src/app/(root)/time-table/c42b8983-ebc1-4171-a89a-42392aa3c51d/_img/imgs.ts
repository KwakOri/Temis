import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
// import ArtistImg from "./main/artist.png";
const MainBG = legacyR2ImageSlot("49adb7c7d0895be670701ea60f816ed14d41b6a353dfdd59ea911e2677379996", 4000, 2250);

const ArtistImg = legacyR2ImageSlot("3801483a58a42f13227949a057d8e7c9fb0e3cb0c649acc3e71dfc711743a1d6", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("c24cc8fa8dd9c3c6af0ff1dbb531ba66cfc1d2ab290735d509e0cd91c6586daf", 640, 600);

// Offline images
const OfflineImg = legacyR2ImageSlot("8de68d9741bb340c97dd1df8304cdf890ade16e26d687d56bdd4a889d98e9118", 640, 600);
const OfflineMemoImg = legacyR2ImageSlot("fac531a025c2d74b4fde44feec670d22c8288134f82910f7f2ed5ac54b3fd53c", 640, 600);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("7979f952e5ff55af3d789b99811c448cbc56224fb4c5918e328018293f5b5d4a", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    offline: OfflineImg,
    offline_memo: OfflineMemoImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
  },
};
