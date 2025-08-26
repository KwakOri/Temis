import { ImgsType } from "@/types/time-table/image";
import BlueBG from "./blue/bg.png";
import BlueOffline from "./blue/offline.png";
import BlueOnline from "./blue/online.png";
import BlueProfile from "./blue/profile.png";
import BlueWeek from "./blue/week.png";
import PinkBG from "./pink/bg.png";
import PinkOffline from "./pink/offline.png";
import PinkOnline from "./pink/online.png";
import PinkProfile from "./pink/profile.png";
import PinkWeek from "./pink/week.png";
import YellowBG from "./yellow/bg.png";
import YellowOffline from "./yellow/offline.png";
import YellowOnline from "./yellow/online.png";
import YellowProfile from "./yellow/profile.png";
import YellowWeek from "./yellow/week.png";

export const Imgs: ImgsType = {
  first: {
    bg: BlueBG,
    offline: BlueOffline,
    online: BlueOnline,
    week: BlueWeek,
    profile: BlueProfile,
  },
  second: {
    bg: YellowBG,
    offline: YellowOffline,
    online: YellowOnline,
    week: YellowWeek,
    profile: YellowProfile,
  },
  third: {
    bg: PinkBG,
    offline: PinkOffline,
    online: PinkOnline,
    week: PinkWeek,
    profile: PinkProfile,
  },
};
