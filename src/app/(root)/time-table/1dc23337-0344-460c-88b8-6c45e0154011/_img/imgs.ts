import { ImgsType } from "@/types/time-table/image";

// Background and main images
import ArtistImg from "./main/artist_seoae.png";
import MainBG from "./main/bg_seoae.png";
import TopObject from "./main/topobject_seoae.png";

// Online images - by day
import MonOnlineImg from "./main/mon_online_seoae.png";
import TueOnlineImg from "./main/tue_online_seoae.png";
import WedOnlineImg from "./main/wed_online_seoae.png";
import ThuOnlineImg from "./main/thu_online_seoae.png";
import FriOnlineImg from "./main/fri_online_seoae.png";
import SatOnlineImg from "./main/sat_online_seoae.png";
import SunOnlineImg from "./main/sun_online_seoae.png";

// Offline images
import OfflineImg from "./main/offline_seoae.png";

// Profile images
import MainProfileFrame from "./main/profile_seoae.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online_mon: MonOnlineImg,
    online_tue: TueOnlineImg,
    online_wed: WedOnlineImg,
    online_thu: ThuOnlineImg,
    online_fri: FriOnlineImg,
    online_sat: SatOnlineImg,
    online_sun: SunOnlineImg,
    profileFrame: MainProfileFrame,
  },
};
