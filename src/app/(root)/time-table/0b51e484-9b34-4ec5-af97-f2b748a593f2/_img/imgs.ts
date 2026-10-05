import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainArtist = legacyR2ImageSlot("47b88c3facb991c9e7e125e901a8ba991f5a62f8d2e9055af4fd568a2767931a", 4000, 2250);
const MainBG = legacyR2ImageSlot("a28b3a4d13ae4046db2e712fba9cd3f42f9241d94e224ba5b4b3053e375975c1", 4000, 2250);
const MainNoArtist = legacyR2ImageSlot("f41faeb12c465abcd931590c06b79a936cef6df0ac9c98a59e71709ff32de705", 4000, 2250);
const TopObject = legacyR2ImageSlot("b0d4bb580a523405bc01b78bceade5e80d5fb2933ae15ba13c6ac82fc07940f6", 4000, 2250);

// Online images
const MainOnline1 = legacyR2ImageSlot("bda9729686545093d035298ef30e5a6b24f93a8d848774afe800b5af19deb84f", 729, 842);
const MainOnline2 = legacyR2ImageSlot("5ddff35ce4d5d47be126333ac6d245949b1cf6b58e46737450be80885a4b5d79", 1262, 546);
const MainOnline3 = legacyR2ImageSlot("41634509dc8619164240f54c6b1c082f7b4ab689bfa1025014167f893b5b5541", 931, 535);

// Offline images
const MainOffline1 = legacyR2ImageSlot("dc808a48ad282297a737e2ba9bc3d565c1bbf4e1b4e8b9dc9d0153e8c2f2c707", 729, 842);
const MainOffline2 = legacyR2ImageSlot("221cba9ef4f472c46f6fb8380adb9770ad5008af5d77d7f537a590db7e29c499", 1262, 546);
const MainOffline3 = legacyR2ImageSlot("303c73f235a1f34cee22e348beef2d21b87831b75f7f962be61db4d70fb2678b", 931, 535);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("b57642e6f1b146cf347704272756979c360de70d06d82ec8777d17ece19b916b", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    online1: MainOnline1,
    online2: MainOnline2,
    online3: MainOnline3,
    offline1: MainOffline1,
    offline2: MainOffline2,
    offline3: MainOffline3,
    artist: MainArtist,
    noArtist: MainNoArtist,
    profileFrame: MainProfileFrame,
  },
};
