import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";
const MainBG = legacyR2ImageSlot("f25c3018f8a0d38dc17ce9e2f15da5c78a981e0f5a446586dbf8cfe6204f6e8a", 1280, 720);
const MainOffline = legacyR2ImageSlot("08e2a7483349e1de9987a67be2f28bfbbc2417daeb874350c0a46d1694c5242f", 237, 181);
const MainOnline = legacyR2ImageSlot("bf8b7353cd91d684a4c9a24a54c99e1b1884a258181e362b86bd07da18db6adf", 242, 184);
const MainProfileBG = legacyR2ImageSlot("2df8c4f67dec10980bebc7e1c80025cf77dd21efb52f575914ef9ebef2dbb640", 349, 466);
const MainProfileFrame = legacyR2ImageSlot("558fd386ea9e76accb4bf3d66aca5ce4786c3ea5850d639cdc82deae09f48d7b", 473, 698);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    profileFrame: MainProfileFrame,
    profileBG: MainProfileBG,
  },
  second: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    profileFrame: MainProfileFrame,
    profileBG: MainProfileBG,
  },
  third: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    profileFrame: MainProfileFrame,
    profileBG: MainProfileBG,
  },
};
