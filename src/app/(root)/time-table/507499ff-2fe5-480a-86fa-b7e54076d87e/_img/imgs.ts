import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const Artist = legacyR2ImageSlot("e75aadd1afff9f53dd834d7a8e98d23ffd1a4cc27dfe569084f146f8f4f05681", 4000, 2250);
const MainBG = legacyR2ImageSlot("35ed1e9e5d5684d73d2dd9f1072b4d532cc29f5c38e35baaa98e2a8a8c1d9d5b", 4000, 2250);

// Online/Offline images
const MemoImg = legacyR2ImageSlot("3a6c039f6a9ec2d7ad65fe42dca7e1c9a2981d749fcd084016c71912cc580241", 800, 617);
const OfflineImg = legacyR2ImageSlot("93c1df4f36aafd69bce32cc4296b75a72ea7ff27b03bb23762c52efd92dbfa8c", 800, 617);
const OnlineImg = legacyR2ImageSlot("8bbfd4c5c59c8da76d2157a8ff94e46db7dcc6ab8468b4a5e7d4ba82ce9faae2", 800, 617);
const Online2Img = legacyR2ImageSlot("9ade62ed4842213c00f715a5eecd8e47de374d605a74815da8a4039bb1cbb803", 800, 617);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("bd5338f9e64ae58040627bfb88e860fcfb0b5dbf99d37527eb09b7e2921af229", 4000, 2250);
const TopObject = legacyR2ImageSlot("4f0ae3ec76d654518edb99d8c3861badf32c52b7a46bd9cf18eab55158394e60", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    bigOnline: Online2Img,
    memo: MemoImg,
    profileFrame: MainProfileFrame,
    topObject: TopObject,
  },
};
