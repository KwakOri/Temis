import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
const ArtistImg = legacyR2ImageSlot("78f66da79e28788e3e7b9ae4cec77f4d9564a35fa689b3c134a3ceb79afcb336", 4000, 2250);
const MainBG = legacyR2ImageSlot("d954ff29b0233eba9cc5a8a5814651f8f245bdeb135b157789a987d6441edac4", 4000, 2250);
const TopObject = legacyR2ImageSlot("0db9e98e77c2afe4548cd34a662fee6fc4aaf8a81bd72bb2f06a92911f466cf2", 4000, 2250);

// Online/Offline images
const MultiImg = legacyR2ImageSlot("a9497d42b3317089aec59e55d66e474d35d8966b02558a45c8af4a75aa5c7f46", 880, 700);
const OfflineImg = legacyR2ImageSlot("16bc0736d95846b2ed5bfbacd14d3f91a2ed30d9e44139bc36ec906e22173a63", 880, 700);
const OnlineImg = legacyR2ImageSlot("1ebe1d42208d21d9033bd905911db9c65b1148efefbb636c6dbb8421598b659b", 880, 700);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("fc71065dac9dc835cff327f5cebc557ba89645a6b0f338c03e7fc66b539adbbc", 4000, 2250);

// Week dates
const WeekDatesImg = legacyR2ImageSlot("ff8e0ff2aa95aa5ebca2d005d823a6c2b5fd6790d6531f1ed0bcf8d4deda5c2b", 4000, 2250);

const CheckGameImg = legacyR2ImageSlot("51024ac194861e8ccd5a4041a8b2b83571cd2a1238eebaa1b36564b76a5667ae", 158, 56);
const CheckNormalImg = legacyR2ImageSlot("db722715edc4f8cc6b2cc58709278722f224199443aaabddae21aec602892319", 93, 42);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    multi: MultiImg,
    profileFrame: MainProfileFrame,
    weekDates: WeekDatesImg,
    checkGame: CheckGameImg,
    checkNormal: CheckNormalImg,
  },
};
