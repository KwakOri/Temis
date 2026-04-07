import { ImgsType } from "@/types/time-table/image";

// Prefix-based mapping for files copied from Y2K assets
import ArtistImg from "./main/artist.png";
import MainBG from "./main/bg.png";
import MemoImg from "./main/memo.png";
import OfflineImg from "./main/offline.png";
import OnlineImg from "./main/online.png";
import Online2Img from "./main/online2.png";
import MainProfileFrame from "./main/frame.png";
import TopObject from "./main/top_object.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    bigOnline: Online2Img,
    memo: MemoImg,
    profileFrame: MainProfileFrame,
  },
};
