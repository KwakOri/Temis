import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainBG from "./main/bg_team_template.png";
import TopObject from "./main/top_object_team_template.png";

// Online/Offline images
import OfflineImg from "./main/offline.png";
import OnlineImg from "./main/online.png";

// Profile images
import UserProfile01 from "./main/user_profile_01_team_template.png";
import UserProfile02 from "./main/user_profile_02_team_template.png";
import UserProfile03 from "./main/user_profile_03_team_template.png";
import UserProfile04 from "./main/user_profile_04_team_template.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    offline: OfflineImg,
    online: OnlineImg,
    topObject: TopObject,
    profile01: UserProfile01,
    profile02: UserProfile02,
    profile03: UserProfile03,
    profile04: UserProfile04,
  },
};
