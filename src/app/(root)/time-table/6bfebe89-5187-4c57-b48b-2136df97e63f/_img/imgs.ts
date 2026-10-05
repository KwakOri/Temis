import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("1e276875c37048cdcddfefd63032d6860ddf16a98244274f364efb3af2a90f4b", 4000, 2250);
const TopObject = legacyR2ImageSlot("28fda575fd62bd2ed6fa88e4e267ef1b9f984cf4c9c1dd04dab757cca822f791", 4000, 2250);
const MainOnline = legacyR2ImageSlot("7b108ab0ff998496d2abdc4b6a41135c8be055489901c98730a6ca9b8a526161", 4000, 2250);
const MainArtist = legacyR2ImageSlot("4d57d4207633f0d8a951ceb19dd23c924d9023067d215eaaaba706b8ab385646", 4000, 2250);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("797ab880aa81b43bbc33d3ada5c557875afeeac8acc4aaf7c222071d369515ef", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    online: MainOnline,
    artist: MainArtist,
    profileFrame: MainProfileFrame,
  },
};
