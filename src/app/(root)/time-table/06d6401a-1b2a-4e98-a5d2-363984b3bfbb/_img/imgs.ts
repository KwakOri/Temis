import { ImgsType } from '@/types/time-table/image';

// Background and main images
import ArtistImg from './main/artist.png';
import MainBG from './main/bg.png';
import Frame from './main/frame.png';
import TopObject from './main/top_object.png';

// Online images
import OnlineBrown from './main/online_brown.png';
import OnlineGreen from './main/online_green.png';
import OnlineLong from './main/online_long.png';

// Offline images
import OfflineLong from './main/offline_long.png';
import OfflineShort from './main/offline_short.png';

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    frame: Frame,
    offlineLong: OfflineLong,
    offlineShort: OfflineShort,
    onlineBrown: OnlineBrown,
    onlineGreen: OnlineGreen,
    onlineLong: OnlineLong,
  },
};
