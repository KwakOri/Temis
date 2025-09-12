import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist_ryu.png";
import MainBG from "./main/bg_ryu.png";
import MainImg from "./main/img_ryu.png";
import TopObject from "./main/top_object_ryu.png";

// Online images
import OnlineFri from "./main/online/online_fri_ryu.png";
import OnlineMon from "./main/online/online_mon_ryu.png";
import OnlineSat from "./main/online/online_sat_ryu.png";
import OnlineSun from "./main/online/online_sun_ryu.png";
import OnlineThu from "./main/online/online_thu_ryu.png";
import OnlineTue from "./main/online/online_tue_ryu.png";
import OnlineWed from "./main/online/online_wed_ryu.png";

// Offline images
import OfflineImg from "./main/offline/offline_ryu.png";

// Profile images
import MainProfileFrame from "./main/profile_ryu.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
    artist: ArtistImg,
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
