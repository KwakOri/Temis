import { ImgsType } from '@/types/time-table/image';

// Background and main images
import MainBG from './main/frame.png';
import TopObject from './main/top_object.png';

// Online/Offline images

import ProfileCosmo from './main/cosmo.png';
import ProfileIra from './main/era.png';
import ProfileRubit from './main/rubit.png';
import ProfileSaebaek from './main/saebaek.png';
import ProfileSaeon from './main/saeon.png';

// Profile images

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    members_cosmo: ProfileCosmo,
    members_ira: ProfileIra,
    members_rubit: ProfileRubit,
    members_saebaek: ProfileSaebaek,
    members_seon: ProfileSaeon,
  },
};
