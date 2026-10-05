import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("ccb0102b6a6379dbf7f88febe4b71ae29e668b648c877f2ba4e4b961e232666f", 4000, 2250);
const MainBG = legacyR2ImageSlot("e692728a852d96e04339e5642873e99bf59e5fa42ab4dca90399f47fbfc9691a", 4000, 2250);
const TopObject = legacyR2ImageSlot("1c12e75cebe0b30915509d844d7ad50c116759b90592eca706126ec3c7b10121", 4000, 2250);

// Online images
const OnlineBottomImg = legacyR2ImageSlot("47bfa65ea636501e490c2d272b4c7aedf4ef7724c62c65f1b6df5a79580b012c", 625, 2082);
const OnlineMidImg = legacyR2ImageSlot("922e6cdd4ab7adb01de7b61d660c3059155530d77443669511b2dfb15f9dd633", 625, 2082);
const OnlineTopImg = legacyR2ImageSlot("0cd97263427ddb5e199dea6e042cc281c4760d206b07dadde9936632c473cd14", 625, 2082);

// Offline images
const OfflineImg = legacyR2ImageSlot("8d25c81e8efc120fdf5dfa5e4936e61d9715e3c344bb1db07414442058b23974", 625, 2082);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("bf09488d568a4882e8cabfdd13010c0df838f369d8feeace01ecafe827e8fbdb", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    onlineTop: OnlineTopImg,
    onlineMid: OnlineMidImg,
    onlineBottom: OnlineBottomImg,
    profileFrame: MainProfileFrame,
  },
};
