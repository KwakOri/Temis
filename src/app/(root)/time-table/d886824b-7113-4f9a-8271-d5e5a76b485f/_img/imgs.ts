import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const Artist = legacyR2ImageSlot("e512bbce2c5024008feec9a7f76cf36f6f762e6f906033c05219098f9fe87c3c", 1216, 370);
const MainBG = legacyR2ImageSlot("6a83a7127c115a2a6d0177b5089c06dc620cc6a0541e571408f825e21808d5a2", 4000, 2250);

// Online/Offline images
const OfflineImg = legacyR2ImageSlot("88fb92cb908a71ecae109efb71fbbcf9cc0e16868bbe034a736746d2faa4fc9c", 727, 534);
const OnlineImg = legacyR2ImageSlot("8edcd86761bcecda33b39adb9fc0feb6bb9b339639a6b0945cce8b6526b27a30", 727, 534);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("043e5f1baa98f0eebaf9d54d1d966a12de13e80d928e667441f620b0e76ec889", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
  },
};
