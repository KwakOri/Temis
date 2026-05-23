import { ImgsType } from '@/types/time-table/image';

import BoardImg from './main/board.png';
import DayFri from './main/day_fri.png';
import DayMon from './main/day_mon.png';
import DaySat from './main/day_sat.png';
import DaySun from './main/day_sun.png';
import DayThu from './main/day_thu.png';
import DayTue from './main/day_tue.png';
import DayWed from './main/day_wed.png';
import OfflineImg from './main/offline.png';
import OnlineImg from './main/online.png';
import ProfileImg from './main/profile.png';
import TopObjectImg from './main/top_object.png';

export const Imgs: ImgsType = {
  first: {
    artist: ProfileImg,
    artist_on: ProfileImg,
    artist_off: ProfileImg,
    board: BoardImg,
    top_object: TopObjectImg,
    offline: OfflineImg,
    offline_mon: DayMon,
    offline_tue: DayTue,
    offline_wed: DayWed,
    offline_thu: DayThu,
    offline_fri: DayFri,
    offline_sat: DaySat,
    offline_sun: DaySun,
    online: OnlineImg,
    online_overlay: OnlineImg,
    online_mon: DayMon,
    online_tue: DayTue,
    online_wed: DayWed,
    online_thu: DayThu,
    online_fri: DayFri,
    online_sat: DaySat,
    online_sun: DaySun,
    profile_frame: ProfileImg,
    week_dates: TopObjectImg,
  },
};
