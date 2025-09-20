import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainBG from "./main/bg_milktea.png";
import MainImg from "./main/img_milktea.png";
import TopObject from "./main/topobject_milktea.png";

// Online/Offline images
import OfflineImg from "./main/offline_milktea.png";
import OnlineImg from "./main/online_milktea.png";

// Profile and additional images
import ArtistImg from "./main/artist_milktea.png";
import MainProfileFrame from "./main/profile_milktea.png";
import StickerImg from "./main/sticker_milktea.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
    topObject: TopObject,
    online: OnlineImg,
    offline: OfflineImg,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    artist: ArtistImg,
    sticker: StickerImg,
  },
};
