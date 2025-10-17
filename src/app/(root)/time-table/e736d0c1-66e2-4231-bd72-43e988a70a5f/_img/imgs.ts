import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/ARTIST_4BEAR.png";
import MainBG from "./main/BG_4BEAR.png";
import TopObject from "./main/TOPOBJECT_4BEAR.png";

// Online images
import OnlineImg from "./main/ONLINE_4BEAR.png";

// Offline images
import OfflineImg from "./main/OFFLINE_4BEAR.png";

// Profile images
import MainProfileFrame from "./main/PROFILE_4BEAR.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
  },
};
