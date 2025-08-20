import { ImgsType } from "@/types/time-table/image";

// Background and main images
import Artist from "./main/artist_nyago.png";
import MainBG from "./main/bg_nyago.png";

// Online/Offline images
import OfflineImg from "./main/offline_nyago.png";
import OnlineImg from "./main/online_nyago.png";

// Profile images
import MainProfileFrame from "./main/profile_nyago.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
  },
};
