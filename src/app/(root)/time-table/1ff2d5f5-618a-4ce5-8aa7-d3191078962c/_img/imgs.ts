import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("8b99b7643f9272c58ff1cd8141731b6605faf4784b72992fd9266562b70f0a8c", 4000, 2250);
const MainBG = legacyR2ImageSlot("294aad4c9c927e912da765c9650797c9a2ba72f9c57b632d65637c6601212aa9", 4000, 2250);
const MainProfileFrame = legacyR2ImageSlot("21aab171c1a6f47b6f73cfeedaa46594c15200062002b8982c5230688ed387d5", 4000, 2250);
const FrameTop = legacyR2ImageSlot("c44b2542e3a1620acc0db4e4c02471b201440b5f6e8db553a11c579604cb7d63", 4000, 2250);
const MemoImg = legacyR2ImageSlot("13c9eec594c8c47bbd3779fe2583969be54faabdee29ea5f4858861ac47d0351", 821, 538);
const MemoObject = legacyR2ImageSlot("ab9866ba8168b4b368a60f99b472f854491b8362e6f4fc96c89511c091d72e0b", 1671, 1857);
const OfflineImg = legacyR2ImageSlot("3694137dce037db9f3387e157547dbb40bcb9130b1053f037311f7d87cf61a7f", 821, 538);
const OnlineImg = legacyR2ImageSlot("031c61dfe622c027d4573bd8aa5184bda254d14fe9cd6daabcc73fd5cb590ec7", 821, 538);
const TopObject = legacyR2ImageSlot("5d0e144cc2aad69380ed180e460bd0da94574d4c363f5752f503a792c9b138e3", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    frameTop: FrameTop,
    memoObject: MemoObject,
    memo: MemoImg,
  },
};
