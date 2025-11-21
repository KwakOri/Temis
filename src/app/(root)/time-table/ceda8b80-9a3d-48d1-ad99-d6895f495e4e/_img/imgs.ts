import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist_nis.png";
import MainBG from "./main/bg_nis.png";
import TopObject from "./main/topobject_nis.png";

// Day images
import DayBlackImg from "./main/day_black_nis.png";
import DayBlueImg from "./main/day_blue_nis.png";

// Online/Offline images
import OnlineImg from "./main/online_nis.png";
import OfflineImg from "./main/offline_nis.png";

// Profile images
import MainProfileFrame from "./main/profile_nis.png";

// Additional images
import ImgNis from "./main/img_nis.png";
import NoArtistImg from "./main/noartist_nis.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    dayBlack: DayBlackImg,
    dayBlue: DayBlueImg,
    online: OnlineImg,
    offline: OfflineImg,
    profileFrame: MainProfileFrame,
    img: ImgNis,
    noArtist: NoArtistImg,
  },
};
