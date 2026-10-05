import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("b4ebd0a17d7131ff46560f7bcdc3f405fcb834ddc273242634c62ad787e5ac3c", 4000, 2250);
const ProfileImg = legacyR2ImageSlot("9260ef2a88723ba700ecded34de808f8e78ccea62b7a6d47a3bf291f1278fdca", 1920, 1080);
const TopObject = legacyR2ImageSlot("136677e38f234dec0fa21890772d2bc59ca6a22f45e44de83c47f7bd62a34ea7", 4000, 2250);

// Online/Offline images - Pink theme
const OfflinePink = legacyR2ImageSlot("4e7f4fd6d35a59df33e6faa6cb6e71ac2c16f2d2715ee689473ddd83ba59f6fb", 616, 627);
const OnlinePink = legacyR2ImageSlot("4e4987f0419043570bfa9404bf4373870f37448220174bd97a81c1d25a1e67a0", 616, 627);

// Online/Offline images - Sky theme
const OfflineSky = legacyR2ImageSlot("17b510354f0d3e206e61ff66b5019d6858a4af3627f520e60b679a8fadd3cc4d", 616, 627);
const OnlineSky = legacyR2ImageSlot("395445e6b500155bed10b95fb3f014d8a45d37289707799428e142a4b3554d72", 616, 627);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("9a542faad2e03061ee091a576b0a53f49e575c6e1b28d726ab9ef5b100c735b3", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: ProfileImg,
    offlinePink: OfflinePink,
    offlineSky: OfflineSky,
    onlinePink: OnlinePink,
    onlineSky: OnlineSky,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    topObject: TopObject,
  },
  // Sky theme variant
};
