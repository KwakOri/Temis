import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("3fe84e06e5a4756df733c5d58398d25c542b8420b5ee265cb734c555d787f7b9", 4000, 2250);
const TopObject = legacyR2ImageSlot("dea327c51a72fa8ea96b444f34f6fc13635b2ce48fc11f5d4dc53b4e2db27c6b", 4000, 2250);

// Offline images (weekday images)
const FriOffline = legacyR2ImageSlot("169701c14d6eff5197eab3fafd3973a45ca71b33e2e288d678c0a61a36d0ec3f", 554, 563);
const MonOffline = legacyR2ImageSlot("825c1a5129da84c1eb2a648459e9183d40004074e6c23f92906f924b7ddc6d0a", 859, 706);
const SatOffline = legacyR2ImageSlot("489b4f9c7ce4a1861f386318c828dbf78ac651173e403eb5b8281e1a3d9904d9", 552, 563);
const SunOffline = legacyR2ImageSlot("32b7450cad2efea3e163f4454783fe46efb1c379aaa1b4522236721c951277a3", 1301, 439);
const ThuOffline = legacyR2ImageSlot("8b4fffa8aa833abcee2feb51ae3ff61a1974e995b7fa0afb2726194a9ba8f277", 735, 658);
const TueOffline = legacyR2ImageSlot("4c557795b95c19ac9c6ad1407b08c29ecab45a8ffbb922677b73d990a029130b", 709, 652);
const WedOffline = legacyR2ImageSlot("43c89fae0c19cb67f4acdb504698470cb840eb71299822f8ef89d0da6a496d24", 648, 602);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("ccbfa943c26794163975d8ebc4358314698b189884b1005f18289ee1ce9ca6c3", 4000, 2250);

const Artist = legacyR2ImageSlot("105d6cc1a6860e5c8d064d4b4272c4ccdd760c6d4bc55c9b15fae161912a7948", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    mon: MonOffline,
    tue: TueOffline,
    wed: WedOffline,
    thu: ThuOffline,
    fri: FriOffline,
    sat: SatOffline,
    sun: SunOffline,
    profileFrame: MainProfileFrame,
    artist: Artist,
  },
};
