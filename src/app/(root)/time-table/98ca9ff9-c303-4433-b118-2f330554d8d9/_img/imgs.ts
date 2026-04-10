import { ImgsType } from '@/types/time-table/image';

// Main object
import TopObject from './main/top_object.png';

// Online images (per day)
import OnlineFri from './main/online_fri.png';
import OnlineMon from './main/online_mon.png';
import OnlineSat from './main/online_sat.png';
import OnlineSun from './main/online_sun.png';
import OnlineThu from './main/online_thu.png';
import OnlineTue from './main/online_tue.png';
import OnlineWed from './main/online_wed.png';

// Offline images (per day)
import OfflineFri from './main/offline_fri.png';
import OfflineMon from './main/offline_mon.png';
import OfflineSat from './main/offline_sat.png';
import OfflineSun from './main/offline_sun.png';
import OfflineThu from './main/offline_thu.png';
import OfflineTue from './main/offline_tue.png';
import OfflineWed from './main/offline_wed.png';

// Profile images
import MainProfileFrame from './main/frame.png';

import OnlineAcc from './main/online_acc.png';

import MainBG from './main/bg.png';

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    profileFrame: MainProfileFrame,
    online_mon: OnlineMon,
    online_tue: OnlineTue,
    online_wed: OnlineWed,
    online_thu: OnlineThu,
    online_fri: OnlineFri,
    online_sat: OnlineSat,
    online_sun: OnlineSun,
    offline_mon: OfflineMon,
    offline_tue: OfflineTue,
    offline_wed: OfflineWed,
    offline_thu: OfflineThu,
    offline_fri: OfflineFri,
    offline_sat: OfflineSat,
    offline_sun: OfflineSun,
    online_acc: OnlineAcc,
  },
};
