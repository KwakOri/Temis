import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("43727a4370e4e250bd60c630e645411c3039a4498d3a0b265aae3b28ae15d59f", 4000, 2250);
const MainImg = legacyR2ImageSlot("a9ff3eb9fd9b437ee2e3ae1f5e3ed9b71c326bcb1605a744855860d5eb32794d", 3534, 1989);
const TopObject = legacyR2ImageSlot("c354b7ce335d9fb837d453f198a6195a96b268f12649b88a16429d4167dd4aad", 4000, 2250);

// Online/Offline images
const OfflineImg = legacyR2ImageSlot("3bc1f3175a0a7786e0b1bf41a7d994689d12b0e9b853dc29d2106a844debb66a", 831, 690);
const OnlineImg = legacyR2ImageSlot("5bf91b1fe7c1f239d63cad6a64da531c7243deff87557ff97cea266368157af9", 831, 690);

// Profile and additional images
const ArtistImg = legacyR2ImageSlot("2236eaf56340847e2d1be76cbecc59f44d81f022ea79abaa36a6a69f08f9d4fa", 4000, 2250);
const MainProfileFrame = legacyR2ImageSlot("3c8f8fd91791490834b176e4b1d58eaa0ccd06dac19639440d07f51a28821072", 4000, 2250);
const StickerImg = legacyR2ImageSlot("29467f783fa7f218f65d20a4365622a698a46e689c8028b728bcadfc4d738439", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
    topObject: TopObject,
    online: OnlineImg,
    offline: OfflineImg,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    artist: ArtistImg,
    sticker: StickerImg,
  },
};
