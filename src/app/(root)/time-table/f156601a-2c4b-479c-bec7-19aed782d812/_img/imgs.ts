import { ImgsType } from '@/types/time-table/image';

// Background and main images
import ArtistImg from './main/artist.png';
import MainBG from './main/bg.png';
import TopObject from './main/top_object.png';

// Online/Offline images
import MultiImg from './main/multi.png';
import OfflineImg from './main/offline.png';
import OnlineImg from './main/online.png';

// Profile images
import MainProfileFrame from './main/frame.png';

// Week dates
import WeekDatesImg from './main/weekdates.png';

import CheckGameImg from './main/check_game.png';
import CheckNormalImg from './main/check_normal.png';

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    multi: MultiImg,
    profileFrame: MainProfileFrame,
    weekDates: WeekDatesImg,
    checkGame: CheckGameImg,
    checkNormal: CheckNormalImg,
  },
};
