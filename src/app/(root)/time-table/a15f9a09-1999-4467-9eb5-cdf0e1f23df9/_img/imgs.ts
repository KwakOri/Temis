import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("988cc0493af026ebe79c39c275ee1b3ab223f8cd3a4980c64f81bcca5a1d2913", 4000, 2250);
const MainBG = legacyR2ImageSlot("0a8db5de6eb80cccab22589d79c897e20a671f48458678e03de9853965c11c43", 4000, 2250);
const TopObject = legacyR2ImageSlot("46f7973480d6387e88aaebb146012dd223b98c42f012ad2f9a86d62a34979296", 4000, 2250);
const MemoImg = legacyR2ImageSlot("ce85170bfbebb1d6b51dc621466c38dd08c4fc9b4e516158b81a4e4992448793", 634, 764);

// Online images
const OnlineImg = legacyR2ImageSlot("2b61020673048dfb108717fa911559cb3bc540c05daef3221f95603ea02383ad", 634, 764);

// Offline images
const OfflineImg = legacyR2ImageSlot("1dde60e044cb93885a6db1c039c0dac9f20ca9885bfd0d3728f843ffa87aefa6", 634, 764);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("e15b9ad36a9146d1a58e2ac840ca701070ff662245dfd28fd86cc55c56fca297", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    memo: MemoImg,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
  },
};
