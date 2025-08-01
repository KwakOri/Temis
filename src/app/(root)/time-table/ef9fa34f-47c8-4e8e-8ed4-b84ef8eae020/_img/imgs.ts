import { StaticImageData } from "next/image";
import MainArtist from "./main/artist_serah.png";
import MainBG from "./main/bg_serah.png";
import MainOffline from "./main/offline_serah.png";
import MainOnline from "./main/online_serah.png";
import MainOnlineTime from "./main/onlinetime_serah.png";
import MainPlaceholder from "./main/placeholder_serah.png";
import MainProfile from "./main/profile_serah.png";
import MainWeek from "./main/week_serah.png";

export const Imgs = {
  first: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    onlineTime: MainOnlineTime,
    placeholder: MainPlaceholder,
    artist: MainArtist,
  },
  second: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    onlineTime: MainOnlineTime,
    placeholder: MainPlaceholder,
    artist: MainArtist,
  },
  third: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    onlineTime: MainOnlineTime,
    placeholder: MainPlaceholder,
    artist: MainArtist,
  },
};

export type ImgTypes = {
  bg: StaticImageData;
  offline: StaticImageData;
  online: StaticImageData;
  week: StaticImageData;
  profile: StaticImageData;
  onlineTime: StaticImageData;
  placeholder: StaticImageData;
  artist: StaticImageData;
};
