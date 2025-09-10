import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainBG from "./main/bg_cherry.png";
import MainImg from "./main/img_cherry.png";
import TopObject from "./main/top_object_cherry.png";

// Online images
import OnlineFri from "./main/online/online_fri_cherry.png";
import OnlineMon from "./main/online/online_mon_cherry.png";
import OnlineSat from "./main/online/online_sat_cherry.png";
import OnlineSun from "./main/online/online_sun_cherry.png";
import OnlineThu from "./main/online/online_thu_cherry.png";
import OnlineTue from "./main/online/online_tue_cherry.png";
import OnlineWed from "./main/online/online_wed_cherry.png";

// Offline images
import OfflineImg from "./main/offline/offline_cherry.png";

// Profile images
import MainProfileFrame from "./main/profile_cherry.png";

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
