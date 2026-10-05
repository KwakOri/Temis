import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("cb3ff30ea136031caafc41666a0091fa7a3c82d34cc3e8b38f34dff29909590d", 4000, 2250);
const MainBG = legacyR2ImageSlot("66eff3093a6086e1f0e04b55a25c8c8e830b73b2443f7553ec8501f10f7a2b09", 4000, 2250);
const TopObject = legacyR2ImageSlot("4430b68ab65f56abf4e95039f64b104a06a5cc2c752c7843ef7350c351b1ffb3", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("a5e387dad1d63c7fe1e5d3f2f45ea5b47fc9babaa127e0fbc6c1e966c7690758", 860, 817);

// Offline images
const OfflineImg = legacyR2ImageSlot("e19eb507c074e6cd4818c9f12b36a37c9389a29ecab7b9ae7fbdc4497609dd33", 860, 817);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("b467740ab950c73d368f921a602861cdaaf57759c15ef6618cd059f1ac5548dd", 4000, 2250);

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
