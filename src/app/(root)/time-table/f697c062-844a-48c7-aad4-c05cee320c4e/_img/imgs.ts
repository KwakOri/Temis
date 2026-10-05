import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("4ede13e7accf9c838c901334c221ff5074b61ff3232ea34545dc8bfc42ac8d55", 4000, 2250);
const BgImg = legacyR2ImageSlot("bb3e48792c6f80cf9062be8eebaa1dd4bdd1d0ab2840f25277b6ff8b95106033", 4000, 2250);
const FrameImg = legacyR2ImageSlot("bc283cfcba16b817b2a918e41872a8fe4c5c14f511dcdc61c0998b7ffaae3a8a", 4000, 2250);
const OfflineImg = legacyR2ImageSlot("bebedd29ad0907704bcaefc77dc9999a6cce2cc93d3e35dc0c53ee2959a70512", 2200, 240);
const OfflineMemoImg = legacyR2ImageSlot("7d15c316496aba3f50f5ca342c30d8dc32d972ab7eaaae6bb2ebc984caf932db", 2200, 240);
const OnlineImg = legacyR2ImageSlot("2c834d1d9214ca2c5ad0a39a3bf178831b52e2149985a2df4a5b83f7fc1a5515", 2200, 240);
const TopObjectImg = legacyR2ImageSlot("e8fe7de2f2a635559d2630fe7243b1901cb930bfe804fdfa981f5c7836949967", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    bg: BgImg,
    frame: FrameImg,
    offline: OfflineImg,
    offline_memo: OfflineMemoImg,
    online: OnlineImg,
    top_object: TopObjectImg,
  },
};
