import { ImgsType } from "@/types/time-table/image";

// Background and main images
import MainArtist from "./main/artist_Sasayakireine.png";
import MainBG from "./main/BG_Sasayakireine.png";
import MainNoArtist from "./main/noartist_Sasayakireine.png";
import TopObject from "./main/topobject_Sasayakireine.png";

// Online images
import MainOnline1 from "./main/online1_Sasayakireine.png";
import MainOnline2 from "./main/online2_Sasayakireine.png";
import MainOnline3 from "./main/online3_Sasayakireine.png";

// Offline images
import MainOffline1 from "./main/offline1_Sasayakireine.png";
import MainOffline2 from "./main/offline2_Sasayakireine.png";
import MainOffline3 from "./main/offline3_Sasayakireine.png";

// Profile images
import MainProfileFrame from "./main/profile_Sasayakireine.png";

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    online1: MainOnline1,
    online2: MainOnline2,
    online3: MainOnline3,
    offline1: MainOffline1,
    offline2: MainOffline2,
    offline3: MainOffline3,
    artist: MainArtist,
    noArtist: MainNoArtist,
    profileFrame: MainProfileFrame,
  },
};
