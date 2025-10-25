import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist_lilabi.png";
import MainBG from "./main/bg_lilabi.png";
import TopObject from "./main/topobject_lilabi.png";

// Online images
import OnlineImg from "./main/online_lilabi.png";

// Offline images
import OfflineImg from "./main/offline_lilabi.png";

// Profile images
import MainProfileFrame from "./main/profile_lilabi.png";

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
