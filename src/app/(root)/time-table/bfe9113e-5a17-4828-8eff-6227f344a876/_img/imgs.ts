import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const FriOffBeleu = legacyR2ImageSlot("533d4c6ba926c338b37833c7e0ec77ab2c6a8a6fd4bc1bf4cb1129aebfc26530", 584, 767);
const FriOnBeleu = legacyR2ImageSlot("68f5093ba13f87a27bacc75ad7bd8d20db888b3a675c1471f51fe4776726823d", 584, 767);
const SatOffBeleu = legacyR2ImageSlot("9aa851ca5dc2bfcc2b186708d541d7d65fec8cd1226c51a00e1facf8b884820d", 584, 767);
const SatOnBeleu = legacyR2ImageSlot("6ee4fef5616684ec5be23d3d19a6fcbfe5424b1b2d5b3a0c5f2512b3e1842027", 584, 767);
const SunOffBeleu = legacyR2ImageSlot("64a9a643e4e0c282ef782ea1e3c871bc0a6fbd4af9337b47910ee0dbec211524", 584, 767);
const SunOnBeleu = legacyR2ImageSlot("8cc290d5b5d62b31b02f6936a9f2aa741c0e8c73a5578d0d2ca56c98c19ab73c", 584, 767);
const ThuOffBeleu = legacyR2ImageSlot("58aa70c6ba870f2d463a948a825289db6445df584039de0c357997e5ebe6d7ea", 584, 767);
const ThuOnBeleu = legacyR2ImageSlot("d2ae912d1b4b978c2336c3d70402de9a63bfa4656c69f2e921a3856fd0fb8853", 584, 767);
const TueOffBeleu = legacyR2ImageSlot("a13f5725244d4c453a00524e2bda8a7dd413a36c3d384d4c7231ca54bc427017", 584, 767);
const TueOnBeleu = legacyR2ImageSlot("3189a9b035ace75ea29eeca24c0c42f8952054d1a4dc25915fcdb5bcc6679262", 584, 767);
const WedOffBeleu = legacyR2ImageSlot("15bd8d59c9468cb3a0378201485e0f67e53a7382e17643b279329fb1b3874cbd", 584, 767);
const WedOnBeleu = legacyR2ImageSlot("9b47d6de2296a31dc879f33fe0d26a4d5b8003b732b140cca03e0aba3416e05d", 584, 767);
const ArtistBeleu = legacyR2ImageSlot("99bc02041783030800d0c75f79df976a2bf9ab771af14e290797b11e1e806c0c", 943, 145);
const BgBeleu = legacyR2ImageSlot("c637a27e2f3a39c7b9b6db625da8fcf11a48e30f024b0501f644ea9f8cf07ab1", 4000, 2250);
const MonOffBeleu = legacyR2ImageSlot("2d5d58b994b2dadea2bcf970d7472389c8120a666dd661b175a0b362561cad6d", 584, 767);
const MonOnBeleu = legacyR2ImageSlot("bf9e5d6f16902b9659023d6c542e38c4b9366c66879d84e48185d5eb10073b7e", 584, 767);
const ProfileBeleu = legacyR2ImageSlot("d9b80d6171bb4c0a1dcacbd62ced005c70376e184e54ebdab24aa8aacc8f8bb4", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: BgBeleu,

    offline: MonOffBeleu,
    online: MonOnBeleu,
    profileFrame: ProfileBeleu,
    artist: ArtistBeleu,
    mon_off: MonOffBeleu,
    mon_on: MonOnBeleu,
    tue_off: TueOffBeleu,
    tue_on: TueOnBeleu,
    wed_off: WedOffBeleu,
    wed_on: WedOnBeleu,
    thu_off: ThuOffBeleu,
    thu_on: ThuOnBeleu,
    fri_off: FriOffBeleu,
    fri_on: FriOnBeleu,
    sat_off: SatOffBeleu,
    sat_on: SatOnBeleu,
    sun_off: SunOffBeleu,
    sun_on: SunOnBeleu,
  },
};
