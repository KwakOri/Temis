import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
const ArtistImg = legacyR2ImageSlot("03b4a9eecdc45bd1b330a9ee425ca275ee255301d6eac79b7d64b232e41b7301", 4000, 2250);
const MainBG = legacyR2ImageSlot("46bae170eaa32954e31b95ca5960f555d3fea666d59bc4ee1817387a079dfc11", 4000, 2250);
const Frame = legacyR2ImageSlot("4135235b74938b3c647e2bd8ee9eb426bf4f5045e157f4d8efc2da42403929a3", 4000, 2250);
const TopObject = legacyR2ImageSlot("1beb2a29436791aacbc0434695ad77d8039e3e848730dd100ade6915f5389f75", 4000, 2250);

// Online images
const OnlineBrown = legacyR2ImageSlot("87a6d4f2a4ba5992f90435c60855afa55abcdecc268ca8212216ef8d5f47279d", 1200, 520);
const OnlineGreen = legacyR2ImageSlot("9a1011e24855036b410fcc4ba8233e6b95deaa1f0114868d54d98322cc620d17", 1200, 520);
const OnlineLong = legacyR2ImageSlot("d1976bbdbf70a58373bddff59388b5e8565cf18e18daf0a459fba9fbf98ab5a7", 1500, 520);

// Offline images
const OfflineLong = legacyR2ImageSlot("78e0482b9f5c243f6a3014364cefc7bdaa38f3bdd1f7bba900e1524c44df0c01", 1500, 520);
const OfflineShort = legacyR2ImageSlot("e34bacfabf5ebee1d75f3ac2d6fa81bf1a520885095c7ab54b427872c0e908a0", 1200, 520);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    frame: Frame,
    offlineLong: OfflineLong,
    offlineShort: OfflineShort,
    onlineBrown: OnlineBrown,
    onlineGreen: OnlineGreen,
    onlineLong: OnlineLong,
  },
};
