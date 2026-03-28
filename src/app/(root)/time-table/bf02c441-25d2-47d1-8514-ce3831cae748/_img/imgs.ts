import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist.png";
import MainBG from "./main/bg.png";
import TopObject from "./main/top_object.png";

// Day images
import DayMon from "./main/day=mon.png";
import DayTue from "./main/day=tue.png";
import DayWed from "./main/day=wed.png";
import DayThu from "./main/day=thu.png";
import DayFri from "./main/day=fri.png";
import DaySat from "./main/day=sat.png";
import DaySun from "./main/day=sun.png";

// Online images
import OnlineImg from "./main/online.png";

// Offline images
import OfflineImg from "./main/offline.png";

// Profile images
import MainProfileFrame from "./main/frame.png";

// Memo images
import MemoImg from "./main/memo.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    dayMon: DayMon,
    dayTue: DayTue,
    dayWed: DayWed,
    dayThu: DayThu,
    dayFri: DayFri,
    daySat: DaySat,
    daySun: DaySun,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    memo: MemoImg,
  },
};
