import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("3d63ea18a4a8304ad98327a240721105527aa77718c86257a1dd3b3b5f7e1a08", 4000, 2250);
const MainBG = legacyR2ImageSlot("029f80c524027ad799ae0cb877446f473f1473d7169324720f813574ed39a9b7", 4000, 2250);
const TopObject = legacyR2ImageSlot("ea0fadc98d4c944c06c810cc04b1f560a8c96638e5e9e132787fc3d09cd84b22", 4000, 2250);

// Day images
const DayMon = legacyR2ImageSlot("e9d7187fa138ddce15bab88e207ec98e49ddf12b7552e15621c1e252df265d63", 240, 120);
const DayTue = legacyR2ImageSlot("faed6f9792502ab67e9f19b49fa3549704d88b26bb9e8b512574f8482bdcc8af", 240, 120);
const DayWed = legacyR2ImageSlot("50510e78e0ca402a21745dbef978f1da35c41ee3dcc48478cd936472339297d1", 240, 120);
const DayThu = legacyR2ImageSlot("7cc82d257af0dc079b9cd16419c7e2e3ec40de617b39f5eff88f65aa539cff27", 240, 120);
const DayFri = legacyR2ImageSlot("4b30a2e1fde74671cec4089b573dd6f9dd31b4dbd1cda05d90de0ccb47db3497", 240, 120);
const DaySat = legacyR2ImageSlot("41470207264b3467d9bd3da41f5408922affcb24fe0e4cea3e9a7d95bed1527d", 240, 120);
const DaySun = legacyR2ImageSlot("e0d5e65ba65f86b9fd8d3ee1d282b278e21cc981bd34041023f5e0da82122e83", 240, 120);

// Online images
const OnlineImg = legacyR2ImageSlot("663a7723de46a05051b16adc7e00d0e50f343eebb5a88dee85d45506c380b50d", 770, 655);

// Offline images
const OfflineImg = legacyR2ImageSlot("a41c3b862acef962a2bff12a3c4b798f85d8c93b52123baee5280d4832e3412e", 770, 655);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("be5c495ad67fc6ad118033d52d6027ac030984f4658ffd0f5141ac30653db153", 4000, 2250);

// Memo images
const MemoImg = legacyR2ImageSlot("e2e43e1e44f546c883a5bcd6cf52692f1c1ab334c1a2f5079096ae428ec8f2b3", 770, 655);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    dayMon: DayMon,
    dayTue: DayTue,
    dayWed: DayWed,
    dayThu: DayThu,
    dayFri: DayFri,
    daySat: DaySat,
    daySun: DaySun,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    memo: MemoImg,
  },
};
