import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("9a6936c1e7ecef0b34ddd8586d2d613f2552b09e4978b71aba37963ad562d290", 4000, 2250);
const MainBG = legacyR2ImageSlot("1231800e7e012e42679e608682d921326368aee44f71f9e68d3b653872627acd", 4000, 2250);
const TopObject = legacyR2ImageSlot("7dd01fb2ec40b49ed79425582e77c5a07f14d513c72aa0a30cf6ef131222ee74", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("e2f53ffff14f31d8b9ef602344f2d55c74f10f2038b14bacf0954bbc09e8c025", 999, 569);

// Offline images
const OfflineImg = legacyR2ImageSlot("12ab222ca4ebb4db3a94b522b551c07c3954f129a1426dfd6dda464a7c14201e", 999, 569);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("987589952035a994f0d5f4f8f2b5fd9271b7defc216bf06121a2b00d7f371a61", 4000, 2250);

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
