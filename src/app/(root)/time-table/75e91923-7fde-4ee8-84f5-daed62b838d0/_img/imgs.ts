import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist_mytyl.png";
import MainBG from "./main/bg_mytyl.png";
import TopObject from "./main/topobject_mytyl.png";

// Online image (unified for all days)
import OnlineImg from "./main/online_mytyl.png";

// Offline images
import OfflineImg from "./main/offline_mytyl.png";

// Profile images
import MainProfileFrame from "./main/profile_mytyl.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online_mon: OnlineImg,
    online_tue: OnlineImg,
    online_wed: OnlineImg,
    online_thu: OnlineImg,
    online_fri: OnlineImg,
    online_sat: OnlineImg,
    online_sun: OnlineImg,
    profileFrame: MainProfileFrame,
  },
};
