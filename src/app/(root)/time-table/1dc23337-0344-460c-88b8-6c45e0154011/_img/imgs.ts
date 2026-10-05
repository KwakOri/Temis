import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("27b6e58c2e9da147d499ce21c93522ab46faba07d4bd24ba56cfb675c60e06c0", 4000, 2249);
const MainBG = legacyR2ImageSlot("e3d837eace0b4206882caa0e6f39933ff811657d48f9643611d89c2c7c90bdcf", 4000, 2249);
const TopObject = legacyR2ImageSlot("37c02f1d781a1611967c771a6a6f591b769c27402184c1237f400e5fc1fa7d3f", 4000, 2249);

// Online images - by day
const MonOnlineImg = legacyR2ImageSlot("445c73a3af5597a9ba3ca27536dd9c732104b9ba2652132c3ac4257d4806ce5c", 532, 713);
const TueOnlineImg = legacyR2ImageSlot("5b28de03bbeb30ee3f16c34fd3104d3e401989d337c5019eb1df86ab93e9b35d", 532, 713);
const WedOnlineImg = legacyR2ImageSlot("e881e59516e2ce3a24470962b2a6b6b3ff13c09d26f21b5b57e5a593668390b4", 532, 713);
const ThuOnlineImg = legacyR2ImageSlot("7f01569b7f9f417a0f2b34c34ee588d40ac86bc77f4146a7103ed72650a9c442", 532, 713);
const FriOnlineImg = legacyR2ImageSlot("e4d2abe800cdcbf314601f702b3867c55d1e8f5e83faa600a34393319b1368ea", 532, 713);
const SatOnlineImg = legacyR2ImageSlot("723e4a12548fe506e1d0fd46bc658c78b58069465386acc37a1b1a26aaf2afce", 532, 713);
const SunOnlineImg = legacyR2ImageSlot("b4bde16ce562b202c0d1fc55f22e9334a808bcf6f367a844c3a428db77366d4b", 532, 713);

// Offline images
const OfflineImg = legacyR2ImageSlot("b828c1fd77351e95e736f13a07b91546f47ffdcf94ba28cde8dd529b2352a563", 532, 713);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("6989fe6f821ff342d5cf7323135435751e2ba51690cdf7756f8d36ff1cdffafb", 4000, 2249);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online_mon: MonOnlineImg,
    online_tue: TueOnlineImg,
    online_wed: WedOnlineImg,
    online_thu: ThuOnlineImg,
    online_fri: FriOnlineImg,
    online_sat: SatOnlineImg,
    online_sun: SunOnlineImg,
    profileFrame: MainProfileFrame,
  },
};
