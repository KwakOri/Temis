import { ImgsType } from '@/types/time-table/image';

// Background and main images
import MainBG from './main/frame.png';
import TopObject from './main/top_object.png';

// Online/Offline images

import {
  default as ProfileCosmo,
  default as ProfileEra,
} from './main/cosmo.png';
import ProfileRubit from './main/rubit.png';
import ProfileSaebaek from './main/saebaek.png';
import ProfileSaeon from './main/saeon.png';
import ProfileSua from './main/sua.png';
// Profile images

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    members_cosmo: ProfileCosmo,
    members_era: ProfileEra,
    members_rubit: ProfileRubit,
    members_saebaek: ProfileSaebaek,
    members_saeon: ProfileSaeon,
    members_sua: ProfileSua,
  },
};

export const memberIdsMap = new Map([
  [275, 'saeback'],
  [22, 'rubit'],
  [280, 'sua'],
  [277, 'cosmo'],
]);
