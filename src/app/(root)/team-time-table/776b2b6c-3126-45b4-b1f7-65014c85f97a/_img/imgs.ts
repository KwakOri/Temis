import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
const MainBG = legacyR2ImageSlot("7cf7b8321ee8df341aaed2f5b3873acaebe47f6873dc7a2e6b04a69d21b4447a", 4000, 2750);
const TopObject = legacyR2ImageSlot("3daffd2ea915390ddca15053a9127794e3eee5fcebc8b7275c0e2dbd69fd9e93", 4000, 2750);

// Online/Offline images

const ProfileCosmo = legacyR2ImageSlot("ee989ed97e1d6d0fb9167db388e37a424f7b5e2295da0b868a1675d743658fe3", 440, 340);
const ProfileIra = legacyR2ImageSlot("f802fd5159d4b45547ee1f8e7a583073aeede080064fa773dec8e258ec3978c8", 440, 340);
const ProfileRubit = legacyR2ImageSlot("bc2c03871380666884df4e17e2767e9c541f65934d3addb9570c7bec2e2c7bb3", 440, 340);
const ProfileSaebaek = legacyR2ImageSlot("d55a520006728a113db09cbec6c6f406f2fcf51664fdd2d6aa7777a8fb41fda7", 440, 340);
const ProfileSaeon = legacyR2ImageSlot("889c6272ab43e4b4e43575d4a32b80827032d2cbbbdbd178f40aea6af83b6ffa", 440, 340);

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
