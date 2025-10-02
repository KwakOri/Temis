import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainBG from "./main/bg_torori.png";
import Artist from "./main/img_torori.png";

// Online/Offline images
import OfflineImg from "./main/offline_torori.png";
import Online2Img from "./main/online2_torori.png";
import OnlineImg from "./main/online_torori.png";

// Profile images
import MainProfileFrame from "./main/profile_torori.png";
import Star from "./main/star_torori.png";
import TopObject from "./main/topobject_torori.png";

export const Imgs: ImgsType = {
  first: {
    star: Star,
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    bigOnline: Online2Img,
    profileFrame: MainProfileFrame,
    topObject: TopObject,
  },
};
