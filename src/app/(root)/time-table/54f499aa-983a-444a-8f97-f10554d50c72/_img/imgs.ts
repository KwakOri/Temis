import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist.png";
import MainBG from "./main/bg.png";
import TopObject from "./main/top_object.png";
import WeekImg from "./main/week.png";

// Online images
import OnlineBigImg from "./main/online_big.png";
import OnlineLongImg from "./main/online_long.png";

// Offline images
import OfflineBigImg from "./main/offline_big.png";
import OfflineLongImg from "./main/offline_long.png";

// Profile images
import MainProfileFrame from "./main/frame.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    week: WeekImg,
    offlineBig: OfflineBigImg,
    offlineLong: OfflineLongImg,
    onlineBig: OnlineBigImg,
    onlineLong: OnlineLongImg,
    profileFrame: MainProfileFrame,
  },
};
