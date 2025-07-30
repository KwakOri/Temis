import { StaticImageData } from "next/image";
import MainBG from "./main/bg.png";
import MainOffline from "./main/offline.png";
import MainOnline from "./main/online.png";
import MainProfile from "./main/profile.png";
import MainWeek from "./main/week.png";

export const Imgs = {
  first: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
  },
  second: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
  },
  third: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
  },
};

export type ImgTypes = {
  bg: StaticImageData;
  offline: StaticImageData;
  online: StaticImageData;
  week: StaticImageData;
  profile: StaticImageData;
};
