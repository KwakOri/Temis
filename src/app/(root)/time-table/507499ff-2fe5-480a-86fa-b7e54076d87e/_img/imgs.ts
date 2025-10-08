import { ImgsType } from "@/types/time-table/image";

// Background and main images
import Artist from "./main/artist_Y2Kblue.png";
import MainBG from "./main/bg_Y2Kblue.png";

// Online/Offline images
import MemoImg from "./main/memo_Y2Kblue.png";
import OfflineImg from "./main/offline_Y2Kblue.png";
import OnlineImg from "./main/online1_Y2Kblue.png";
import Online2Img from "./main/online2_Y2Kblue.png";

// Profile images
import MainProfileFrame from "./main/profile_Y2Kblue.png";
import TopObject from "./main/topobject_Y2Kblue.png";

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
