import { ImgsType } from '@/types/time-table/image';

// Background and main images
import ArtistImg from './main/artist.png';
import MainBG from './main/bg.png';
import DaysFri from './main/days_fri.png';
import DaysMon from './main/days_mon.png';
import DaysSat from './main/days_sat.png';
import DaysSun from './main/days_sun.png';
import DaysThu from './main/days_thu.png';
import DaysTue from './main/days_tue.png';
import DaysWed from './main/days_wed.png';
import MultiImg from './main/multi.png';
import OfflineImg from './main/offline.png';
import OnlineImg from './main/online.png';
import ProfileFrame from './main/profile.png';
import ProfilePlate from './main/profile_plate.png';
import TimeImg from './main/time.png';
import TopObject from './main/top_object.png';
import WeekImg from './main/week.png';

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    week: WeekImg,
    time: TimeImg,
    days_mon: DaysMon,
    days_tue: DaysTue,
    days_wed: DaysWed,
    days_thu: DaysThu,
    days_fri: DaysFri,
    days_sat: DaysSat,
    days_sun: DaysSun,
    profileFrame: ProfileFrame,
    profileBG: ProfilePlate,
    online: OnlineImg,
    offline: OfflineImg,
    multi: MultiImg,
  },
};
