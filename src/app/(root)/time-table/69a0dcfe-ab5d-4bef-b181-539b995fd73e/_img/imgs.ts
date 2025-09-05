import { ImgsType } from "@/types/time-table/image";

// Background and main images
import Artist from "./main/artist_maumau.png";
import MainBG from "./main/bg_maumau.png";
import Schedule from "./main/schedule_maumau.png";

// Online/Offline images - Orange variant
import OfflineOrange from "./main/offline_orenge_maumau.png";
import OnlineOrange from "./main/online_orenge_maumau.png";
import BigOfflineOrange from "./main/big_offline_orenge_maumau.png";
import BigOnlineOrange from "./main/big_online_orenge_maumau.png";

// Online/Offline images - Yellow variant
import OfflineYellow from "./main/offline_yellow_maumau.png";
import OnlineYellow from "./main/online_yellow_maumau.png";
import BigOfflineYellow from "./main/big_offline_yellow_maumau.png";
import BigOnlineYellow from "./main/big_online_yellow_maumau.png";

// Profile images
import MainProfileFrame from "./main/profile_maumau.png";
import TopObject from "./main/top_object_maumau.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineOrange,
    online: OnlineOrange,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    topObject: TopObject,
    schedule: Schedule,
    bigOffline: BigOfflineOrange,
    bigOnline: BigOnlineOrange,
    offlineYellow: OfflineYellow,
    onlineYellow: OnlineYellow,
    bigOfflineYellow: BigOfflineYellow,
    bigOnlineYellow: BigOnlineYellow,
  },
};
