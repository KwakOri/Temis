import { ImgsType } from "@/types/time-table/image";

// Background and main images

import MainBG from "./main/bg_yanz.png";

import TopObject from "./main/top_object_yanz.png";

// Online images
import OnlineFri from "./main/online/online_fri_yanz.png";
import OnlineMon from "./main/online/online_mon_yanz.png";
import OnlineSat from "./main/online/online_sat_yanz.png";
import OnlineSun from "./main/online/online_sun_yanz.png";
import OnlineThu from "./main/online/online_thu_yanz.png";
import OnlineTue from "./main/online/online_tue_yanz.png";
import OnlineWed from "./main/online/online_wed_yanz.png";

// Offline images
import OfflineImg from "./main/offline/offline_yanz.png";

// Profile images
import MainProfileFrame from "./main/profile_yanz.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    offline: OfflineImg,

    mon: OnlineMon,
    tue: OnlineTue,
    wed: OnlineWed,
    thu: OnlineThu,
    fri: OnlineFri,
    sat: OnlineSat,
    sun: OnlineSun,

    profileFrame: MainProfileFrame,
  },
};
