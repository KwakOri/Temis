import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainBG from "./main/bg_whiteyaan.png";
import ProfileImg from "./main/img_whiteyaan.png";
import TopObject from "./main/topobject_whiteyaan.png";

// Online/Offline images - Pink theme
import OfflinePink from "./main/offline_pink_whiteyaan.png";
import OnlinePink from "./main/online_pink_whiteyaan.png";

// Online/Offline images - Sky theme
import OfflineSky from "./main/offline_sky_whiteyaan.png";
import OnlineSky from "./main/online_sky_whiteyaan.png";

// Profile images
import MainProfileFrame from "./main/profile_whiteyaan.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: ProfileImg,
    offlinePink: OfflinePink,
    offlineSky: OfflineSky,
    onlinePink: OnlinePink,
    onlineSky: OnlineSky,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    topObject: TopObject,
  },
  // Sky theme variant
};
