import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist_mamu.png";
import MainBG from "./main/bg_mamu.png";
import TopObject from "./main/topobject_mamu.png";

// Online images
import OnlineImg from "./main/online_mamu.png";

// Offline images
import OfflineImg from "./main/offline_mamu.png";

// Profile images
import MainProfileFrame from "./main/profile_mamu.png";

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
