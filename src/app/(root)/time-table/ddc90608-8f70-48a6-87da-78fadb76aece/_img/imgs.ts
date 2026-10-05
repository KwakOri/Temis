import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("6b6f2bd5b563f668d7b2a5bd5d112684fcc3966141c9628bc0b905fbc3751719", 4000, 2250);
const MainBG = legacyR2ImageSlot("685c19565994085a729a9f65ecb5ed7a12d8ed258f0c8625ce4364db85f5b5c0", 4000, 2250);
const TopObject = legacyR2ImageSlot("76f233963a4af27797f63fd5062e9f72a1f65052cdcfb5541c871f210318b407", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("a9ccbf88f7b8292ccf78f8520257a06a900e7a7a2d0dd1f0628d2935675714d0", 825, 604);

// Offline images
const OfflineImg = legacyR2ImageSlot("8e8441aeac065d10e8d3afd27a67cd72f555435e9230bb2719e021336281a90e", 825, 605);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("e2a6c6def92e3c0820a3873c577903b7b05c9cc97f7f22eae38e73eca5ec4a29", 4000, 2250);

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
