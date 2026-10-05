import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("8888780c5b5eaba74acfe7946f47ab1d4b4ef26f5fc6e8242bcb780b885f4723", 4000, 2250);
const TopObject = legacyR2ImageSlot("34f0c0c72d4803197e6615768ef1b52831b533984cd4aaf111c19506973dc56b", 4000, 2250);

// Online/Offline images
const OfflineImg = legacyR2ImageSlot("b25d7c3cfc81e0e487dd6dc0b78229aadcaf3c2b8ddabe851c5e23dcb5c35545", 370, 370);
const OnlineImg = legacyR2ImageSlot("5a2cc5be5d930687d0e4cece9454785328ef949a70d65a2d1af2b1ccb08e1f5d", 370, 370);

// Profile images
const UserProfile01 = legacyR2ImageSlot("52b2bbc68d10fc846e9afc99124e9fca20930f96f123eea4ce704b4a8e4920a3", 1119, 462);
const UserProfile02 = legacyR2ImageSlot("e0bdb296dd3e1c69ff9f2268be0eea51ffc41231aa799a0db547d2dbc50627c8", 1119, 462);
const UserProfile03 = legacyR2ImageSlot("26ad9cc8d080c35ed5f717b6795d5fe85369f70007b140648a0be7d99108afe6", 1119, 462);
const UserProfile04 = legacyR2ImageSlot("0ed7e0e2098a80262ed5671d600f0afbc4413ecb9932ba93fa14673f78fdb67a", 1119, 462);

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
