import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainBG from "./main/bg_aki.png";
import MainImg from "./main/img_aki.png";
import TopObject from "./main/top_object_aki.png";

// Online images
import OnlineFri from "./main/online/online_fri_aki.png";
import OnlineMon from "./main/online/online_mon_aki.png";
import OnlineSat from "./main/online/online_sat_aki.png";
import OnlineSun from "./main/online/online_sun_aki.png";
import OnlineThu from "./main/online/online_thu_aki.png";
import OnlineTue from "./main/online/online_tue_aki.png";
import OnlineWed from "./main/online/online_wed_aki.png";

// Offline images
import OfflineBrown from "./main/offline/offline_brown_aki.png";
import OfflineGreen from "./main/offline/offline_green_aki.png";

// Profile images
import Artist from "./main/artist_aki.png";
import MainProfileFrame from "./main/profile_aki.png";
import MainProfileBG from "./main/profile_bg_aki.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
    topObject: TopObject,

    even: OfflineBrown,
    odd: OfflineGreen,

    mon: OnlineMon,
    tue: OnlineTue,
    wed: OnlineWed,
    thu: OnlineThu,
    fri: OnlineFri,
    sat: OnlineSat,
    sun: OnlineSun,

    profileFrame: MainProfileFrame,
    profileBG: MainProfileBG,
    artist: Artist,
  },
};
