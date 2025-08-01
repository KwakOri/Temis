import { StaticImageData } from "next/image";
import MainBG from "./main/bg_dohwabi.png";
import MainOffline from "./main/offline_dohwabi.png";
import MainOnline from "./main/online_dohwabi.png";
import MainPlaceholderImage from "./main/placeholder_image.png";
import MainProfile from "./main/profile_dohwabi.png";
import MainWeek from "./main/week_dohwabi.png";

export const Imgs = {
  first: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    placeholder_image: MainPlaceholderImage,
  },
  second: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    placeholder_image: MainPlaceholderImage,
  },
  third: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    placeholder_image: MainPlaceholderImage,
  },
};

export type ImgTypes = {
  bg: StaticImageData;
  offline: StaticImageData;
  online: StaticImageData;
  week: StaticImageData;
  profile: StaticImageData;
  placeholder_image: StaticImageData;
};
