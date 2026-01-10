import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist.png";
import MainBG from "./main/bg.png";
import TopObject from "./main/top_object.png";

// Online images
import OnlineImg from "./main/online.png";

// Offline images
import OfflineImg from "./main/offline.png";

// Profile images
import MainProfileFrame from "./main/frame.png";

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
