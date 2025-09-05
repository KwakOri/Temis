import { ImgsType } from "@/types/time-table/image";

// Background and main images
import Artist from "./main/artist_celes.png";
import MainBG from "./main/bg_celes.png";

// Online/Offline images
import BigOnlineImg from "./main/big_online_celes.png";
import OfflineImg from "./main/offline_celes.png";
import OfflineMemoImg from "./main/offline_memo_celes.png";
import OnlineImg from "./main/online_celes.png";

// Profile images
import MainProfileFrame from "./main/profile_celes.png";
import TopObject from "./main/topobject_celes.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    bigOnline: BigOnlineImg,
    offline: OfflineImg,
    offlineMemo: OfflineMemoImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    topObject: TopObject,
  },
};
