import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist_NanKong.png";
import MainBG from "./main/bg_NanKong.png";
import TopObject from "./main/topobject_NanKong.png";

// Online images
import OnlineBottomImg from "./main/online_bottom_NanKong.png";
import OnlineMidImg from "./main/online_mid_NanKong.png";
import OnlineTopImg from "./main/online_top_NanKong.png";

// Offline images
import OfflineImg from "./main/offline_NanKong.png";

// Profile images
import MainProfileFrame from "./main/profile_NanKong.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    onlineTop: OnlineTopImg,
    onlineMid: OnlineMidImg,
    onlineBottom: OnlineBottomImg,
    profileFrame: MainProfileFrame,
  },
};
