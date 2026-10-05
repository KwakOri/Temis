import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("aaf469bdaf9aa26b9a06c8f56aaa2384291aaa35735440f4e0f738a84b545764", 4000, 2250);
const MainBG = legacyR2ImageSlot("5e746e188318876a8c5a1bba9b8edb980976e7d1a0f92c2d5dddec747b3593b9", 4000, 2250);
const MainProfileFrame = legacyR2ImageSlot("8905448362828b2b270035c19c495122dfe8c1be8e73203caa0e4b26b65e6d7e", 4000, 2250);
const Memo = legacyR2ImageSlot("512783e46c21708d07dc9ed84f2649ef4f7b4e2e322b707c198977d215693e16", 718, 684);
const Time = legacyR2ImageSlot("41ec9c7c06c1d3244ee9020963c1cf3f274952db9d094897469230db98bb30a0", 256, 61);
const TopObject = legacyR2ImageSlot("fff45daebcd3acf5dc313d918b738fa77d84d84c3c4cf9882613fba9a06f77fd", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    profileFrame: MainProfileFrame,
    memo: Memo,
    time: Time,
  },
};
