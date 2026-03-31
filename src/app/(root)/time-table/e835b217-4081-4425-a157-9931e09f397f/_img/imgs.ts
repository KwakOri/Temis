import { ImgsType } from '@/types/time-table/image';

// Background and main images
// import ArtistImg from "./main/artist.png";
import MainBG from './main/bg.png';

// Online images
import OnlineImg from './main/online.png';

// Offline images
import OfflineImg from './main/offline.png';

import OfflineMemoImg from './main/offline_memo.png';

// Profile images
import MainProfileFrame from './main/frame.png';

import MemoImg from './main/memo.png';

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    offline: OfflineImg,
    offlineMemo: OfflineMemoImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    memo: MemoImg,
  },
};
