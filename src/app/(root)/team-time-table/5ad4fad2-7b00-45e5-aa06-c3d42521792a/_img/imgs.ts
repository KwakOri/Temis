import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("33e8ed394afd5dfc5db607c3d125e8723b37d966df41cf1ae1b785d85bdce486", 4000, 2250);
const TopObject = legacyR2ImageSlot("499d38cce11fcf2b67a019a18ab8b94cf3b1d1a554be5ec67c0342bb2b8e0338", 4000, 2250);

// Online/Offline images
const OfflineImg = legacyR2ImageSlot("21fe79584b223da0fd39710ffc875f4bfc3a01d69c556cf8af30a3ef0455b3eb", 370, 370);
const OnlineImg = legacyR2ImageSlot("1c86167eb308f28428aabeb76331b6f022bf20fe37be5688d2e451c06bab54a6", 370, 370);

// Profile images
const UserProfile01 = legacyR2ImageSlot("7e34a3e9d2107735dfe2271f3f5278acb391f66b020c55d2c10be5369ae41151", 1119, 462);
const UserProfile02 = legacyR2ImageSlot("435759a035237da4f0fb89d0a43d10b38597cf3ed3a35477ac1970fdb78fa5e9", 1119, 462);
const UserProfile03 = legacyR2ImageSlot("82b75c8127313d595f31f3fd76671fa080163ade555905b1aea6c91f80748e81", 1119, 462);
const UserProfile04 = legacyR2ImageSlot("5875bcc5a500b8a7d890a030508a4b5aef0146958acde3f7c6646791b2443f55", 1119, 462);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    offline: OfflineImg,
    online: OnlineImg,
    topObject: TopObject,
    profile1: UserProfile01,
    profile2: UserProfile02,
    profile3: UserProfile03,
    profile4: UserProfile04,
  },
};
