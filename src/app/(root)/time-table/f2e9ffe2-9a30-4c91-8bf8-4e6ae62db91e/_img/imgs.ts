import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("aaa7e85a8172261cbcd05292cc6566147b14ee7abfaf678b0771a3050ef8d6d5", 4000, 2250);
const MainBG = legacyR2ImageSlot("1eec1b5cef902dcbb60d928652aad91c972173f3a818227a2e349cd76ad860b5", 4000, 2250);
const TopObject = legacyR2ImageSlot("184fa6208ec9789ec0e905995d15434080db62231cf4e89ffbdc4539856e07ce", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("faa777c2701b2b44dd25b0fe980f423bba5de954d0eefd2e12a112ac548a597e", 847, 586);

// Offline images
const OfflineImg = legacyR2ImageSlot("bef99d40733d7e51cc3fdc2a486c12ee5eed7def12ef779706c909d7aa8d4fc8", 847, 586);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("6e8c9b036669ea01ef23a1f4b9e452becd6a4a828e485da56cf821d9c5b7c2e1", 4000, 2250);

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
