import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist_jerry.png";
import MainBG from "./main/bg_jerry.png";
import TopObject from "./main/top_object_jerry.png";

// Online images
import OnlineImg from "./main/online_jerry.png";

// Offline images
import OfflineImg from "./main/offline_jerry.png";

// Profile images
import MainProfileFrame from "./main/frame_jerry.png";

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
