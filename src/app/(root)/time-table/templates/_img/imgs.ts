import { StaticImageData } from "next/image";
import { TTheme } from "../_settings/settings";
import PrimaryBG from "./main/bg.png";
import PrimaryOffline from "./main/offline.png";
import PrimaryOnline from "./main/online.png";
import PrimaryProfile from "./main/profile.png";
import PrimaryWeek from "./main/week.png";

export const Imgs: Record<
  TTheme,
  {
    bg: StaticImageData;
    offline: StaticImageData;
    online: StaticImageData;
    week: StaticImageData;
    profile: StaticImageData;
  }
> = {
  main: {
    bg: PrimaryBG,
    offline: PrimaryOffline,
    online: PrimaryOnline,
    week: PrimaryWeek,
    profile: PrimaryProfile,
  },
};
