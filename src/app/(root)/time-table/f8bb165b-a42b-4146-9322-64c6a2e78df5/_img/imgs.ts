import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
// import ArtistImg from "./main/artist.png";
const MainBG = legacyR2ImageSlot("a6ccdfac5a975726b94203606009d25ad3df18236301660d264c63af350fc439", 4000, 2250);

const ArtistImg = legacyR2ImageSlot("dd22def5cefd89b2627b218ed279cc4a8f571b488e2145f11a224b9b627776c3", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("a604b27fd802a01901adda4ce88ae74043b3e471109e74888c3269326b8ac468", 640, 600);

// Offline images
const OfflineImg = legacyR2ImageSlot("f4d85e275eaeb71c2e06916b9c15a40ecfef16019f2c530fa690121667815116", 640, 600);
const OfflineMemoImg = legacyR2ImageSlot("b430f0b2b269e0281b719b6ac47576b5a64dfb2ab9b7162ec91e95507e029712", 640, 600);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("e71595a9ece76e57b47b789cffb1733273c418fe3510c23c5dc3c430fa30d4a3", 4000, 2250);

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
