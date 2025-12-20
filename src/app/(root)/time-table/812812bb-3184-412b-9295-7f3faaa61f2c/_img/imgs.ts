import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainBG from "./main/bg_senan.png";
import ArtistImg from "./main/img_senan.png";
import TopObject from "./main/topobject_senan.png";

// Online image (unified for all days)
import OnlineImg from "./main/time_senan.png";

// Offline images
import OfflineImg from "./main/offline_senan.png";

// Profile images
import MainProfileFrame from "./main/profile_senan.png";

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
