import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("11bc61950c79da627022bc74541422987edd051ace14a6c6008c82275ae46016", 4000, 2250);
const MainImg = legacyR2ImageSlot("0e747bdf924bff5513365816ef7d1f683af878914122c3b7afae7526ec8977ea", 2369, 1336);
const TopObject = legacyR2ImageSlot("7bd30fd88e5c6a8947f73107b496f288ac09ce3b21c0783a1fde39aeecf03d1e", 4000, 2250);

// Online images
const OnlineFri = legacyR2ImageSlot("dafd6bbc42f6cf1e2d071aebe3fa9715e7701691982150d91e0203055316aad0", 614, 604);
const OnlineMon = legacyR2ImageSlot("c17db3ce7f159bae3e55cfe421e4c2bd964c227ab5554996c76697af0f50f202", 614, 604);
const OnlineSat = legacyR2ImageSlot("509e947a60c444f7e4c77839411e8891edace677f5207bd44a88dc651c0d90b2", 614, 604);
const OnlineSun = legacyR2ImageSlot("1d451e2b903f0185d4c24bac43cb4a3bb8f92ac5973dbcc9a7cf69447129a806", 614, 604);
const OnlineThu = legacyR2ImageSlot("a9225faa5322bb414d425c4d1046c832e39a34695cd54e57f93cbec7cf09c927", 614, 604);
const OnlineTue = legacyR2ImageSlot("98c07fb6a4b28fcfc73c1034a31ac1594844aa863a24aa827a47c4fe35d2fee5", 614, 604);
const OnlineWed = legacyR2ImageSlot("13619c53f089b9e17e27c0dde8793d775a196ff516dcd5932bb5cfb222f87660", 614, 604);

// Offline images
const OfflineImg = legacyR2ImageSlot("31b165cf136af19daff4643ee2fdd5fa7b1723f14340c2cb3d79825bfbfb6426", 614, 604);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("8438d38288502c20af91b6345b3b07347286248ae0a4c03ae67bf0476d2d03cd", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
    topObject: TopObject,

    offline: OfflineImg,

    mon: OnlineMon,
    tue: OnlineTue,
    wed: OnlineWed,
    thu: OnlineThu,
    fri: OnlineFri,
    sat: OnlineSat,
    sun: OnlineSun,

    profileFrame: MainProfileFrame,
    profileBG: MainBG,
  },
};
