import { ImgsType } from "@/types/time-table/image";

// Background and main images
import Artist from "./main/artist_Y2Kred.png";
import MainBG from "./main/bg_Y2Kred.png";

// Online/Offline images
import MemoImg from "./main/memo_Y2Kred.png";
import OfflineImg from "./main/offline_Y2Kred.png";
import OnlineImg from "./main/online1_Y2Kred.png";
import Online2Img from "./main/online2_Y2Kred.png";

// Profile images
import MainProfileFrame from "./main/profile_Y2Kred.png";
import TopObject from "./main/topobject_Y2Kred.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    bigOnline: Online2Img,
    memo: MemoImg,
    profileFrame: MainProfileFrame,
    topObject: TopObject,
  },
};
