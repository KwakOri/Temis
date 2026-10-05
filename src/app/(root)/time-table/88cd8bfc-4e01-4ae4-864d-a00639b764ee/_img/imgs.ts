import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
const Artist = legacyR2ImageSlot("2bc8a25b7243336bf4323a3c1e56f7affcc7609554e57f496e6e62485638636a", 535, 577);
const MainBG = legacyR2ImageSlot("eb89144cac6f8d5de54672f811fde3a3640ce989c246a3180dec9463fe764377", 4000, 2250);

// Online/Offline images
const MultiImg = legacyR2ImageSlot("a6949edb6a48f6786a323411cfd0a14128412d38bbb3d21c131a1ff2b1cc0e3e", 760, 602);
const OfflineImg = legacyR2ImageSlot("f21f45dbcf57764685d0c434567298653a08348072077df81c3a3f2357b6f317", 749, 597);
const OnlineImg = legacyR2ImageSlot("9d31e26ff66a4ef521710a22376ecb5f33d7823c1bb1818f7ee17dd7727cd153", 750, 602);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("5d267f0d11da0f431711684869957bc2e3537d885740683c4223628c27be1fc2", 4000, 2250);
const TopObject = legacyR2ImageSlot("12ac892d15af8046bb9aabd3aa0b3cb694755be315fe6e824c39169c5c82820c", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    multi: MultiImg,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    topObject: TopObject,
  },
};
