import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainBG from "./main/background_okshu.png";
import MainImg from "./main/img_okshu.png";
import TopObject from "./main/top_object_okshu.png";

// Online images
import OnlineFri from "./main/online/online_fri_okshu.png";
import OnlineMon from "./main/online/online_mon_okshu.png";
import OnlineSat from "./main/online/online_sat_okshu.png";
import OnlineSun from "./main/online/online_sun_okshu.png";
import OnlineThu from "./main/online/online_thu_okshu.png";
import OnlineTue from "./main/online/online_tue_okshu.png";
import OnlineWed from "./main/online/online_wed_okshu.png";

// Offline images
import OfflineImg from "./main/offline/offline_okshu.png";

// Profile images

import MainProfileFrame from "./main/profile_okshu.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
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
    profileBG: MainBG,
  },
};
