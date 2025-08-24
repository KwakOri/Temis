import { ImgsType } from "@/types/time-table/image";

// Background and main images
import Artist from "./main/artist_rubit.png";
import MainBG from "./main/bg_rubit.png";

// Online/Offline images
import OfflineImg from "./main/offline_rubit.png";
import OnlineImg from "./main/online_rubit.png";

// Profile images
import MainProfileFrame from "./main/profile_rubit.png";
import TopObject from "./main/top_object_rubit.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    topObject: TopObject,
  },
};
