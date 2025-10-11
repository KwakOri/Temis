import { ImgsType } from "@/types/time-table/image";

// Background and main images
import Artist from "./main/artist_Y2Kyellow.png";
import MainBG from "./main/background_Y2Kyellow.png";

// Online/Offline images
import MemoImg from "./main/memo_Y2Kyellow.png";
import OfflineImg from "./main/offline_Y2Kyellow.png";
import OnlineImg from "./main/online1_Y2Kyellow.png";
import Online2Img from "./main/online2_Y2Kyellow.png";

// Profile images
import MainProfileFrame from "./main/profile_Y2Kyellow.png";
import TopObject from "./main/topobject_Y2Kyellow.png";

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
