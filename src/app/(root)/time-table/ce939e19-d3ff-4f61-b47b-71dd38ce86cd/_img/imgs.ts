import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images

const MainBG = legacyR2ImageSlot("fa71ae4ee6233b77564a54108f952f38f2fc6ce72969982f23cccc0c8bafc2d3", 4000, 2250);
const TopObject = legacyR2ImageSlot("dada675dad74887c3f31041d11127c97ae20cf3df0ab53a477d115eb0580f620", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("c3e51b0bc7d6d150f82a3d8ecec53cde835b8dbbc877429e67d1337d867437ca", 628, 879);

// Offline images

// Profile images
const ArtistIcon = legacyR2ImageSlot("84fa59b3dc72857e134b3f99fa0d79d77ae707641dc9e23166ea98c3f97f0953", 113, 113);
const MainProfileFrame = legacyR2ImageSlot("0126d6729cf2e01e0dabf7249559cfef8fa17646b22ce68dfa505e5229bdf044", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    artistIcon: ArtistIcon,
  },
};
