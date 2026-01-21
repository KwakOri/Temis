import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist.png";
import MainBG from "./main/bg.png";
import TopObject from "./main/top_boject.png";

// Online images
import OnlineImgA from "./main/online_a.png";
import OnlineImgB from "./main/online_b.png";
import OnlineImgC from "./main/online_c.png";
import OnlineImgD from "./main/online_d.png";

// Offline images
import OfflineImgA from "./main/offline_a.png";
import OfflineImgB from "./main/offline_b.png";
import OfflineImgC from "./main/offline_c.png";
import OfflineImgD from "./main/offline_d.png";

// Profile images
import MainProfileFrame from "./main/frame.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offlineA: OfflineImgA,
    offlineB: OfflineImgB,
    offlineC: OfflineImgC,
    offlineD: OfflineImgD,
    onlineA: OnlineImgA,
    onlineB: OnlineImgB,
    onlineC: OnlineImgC,
    onlineD: OnlineImgD,
    profileFrame: MainProfileFrame,
  },
};
