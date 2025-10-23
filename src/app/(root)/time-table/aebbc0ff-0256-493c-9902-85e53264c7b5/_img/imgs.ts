import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainBG from "./main/bg_Leviyan.png";
import TopObject from "./main/top_object_Leviyan.png";

// Offline images (weekday images)
import FriOffline from "./main/fri_Leviyan.png";
import MonOffline from "./main/mon_Leviyan.png";
import SatOffline from "./main/sat_Leviyan.png";
import SunOffline from "./main/sun_Leviyan.png";
import ThuOffline from "./main/thu_Leviyan.png";
import TueOffline from "./main/tue_Leviyan.png";
import WedOffline from "./main/wed_Leviyan.png";

// Profile images
import MainProfileFrame from "./main/profile_Leviyan.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    mon: MonOffline,
    tue: TueOffline,
    wed: WedOffline,
    thu: ThuOffline,
    fri: FriOffline,
    sat: SatOffline,
    sun: SunOffline,
    profileFrame: MainProfileFrame,
  },
};
