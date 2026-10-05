import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("b139df995c47bf3c2511f03ad0b083ef4fdb273f1621329a57d235eae6adf299", 4000, 2250);
const ArtistImg = legacyR2ImageSlot("c947a313b0572f463065551a5f0c1e6be87e697af24c52fd7c2b9fb39a198139", 4000, 2250);
const TopObject = legacyR2ImageSlot("84171e55f6b69772df2b33fb1ee52bbf811184f33667084ea7797efc697fb6cb", 4000, 2250);

// Online image (unified for all days)
const OnlineImg = legacyR2ImageSlot("cf01916a3751c4bd48fc00b904ed568b16619ab2e61bf2857be8fcf2ecaa2ed6", 339, 88);

// Offline images
const OfflineImg = legacyR2ImageSlot("6da93832b5871999685dbdcd88b732d15e1005000c3b523d6e54391bf60e70b0", 331, 319);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("3294db496f8d73b56a5da19b76e34aac0575deb910e829c7bdc64e2e432490a1", 4000, 2250);

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
