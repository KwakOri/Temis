import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("ef43406ecb7f308b37777695bb1559f258581b8c3cdc8a52fed1d87533a2da77", 4000, 2250);
const MainBG = legacyR2ImageSlot("cc9e0a812e6f3208f04accf4b1ef250f8281a92ac214507fb9cf64f815a96915", 4000, 2250);
const TopObject = legacyR2ImageSlot("1a6213709e5bfc3d8ca72e7a8f91c0a192c70325e3c7c0ef1937fc48c15f220a", 4000, 2250);

// Day images
const DayBlackImg = legacyR2ImageSlot("0d9607e44ed4b9636569ddddd91279730a5d626de1e91aa32ca3900fdcc1309c", 333, 153);
const DayBlueImg = legacyR2ImageSlot("ae9bf1f632f068fb4c85899a7b38369dea309fcc8628af85d2625241a6efd1b7", 333, 153);

// Online/Offline images
const OnlineImg = legacyR2ImageSlot("bc1b0c74d767bc046f84bf39cf1f9268e337db30bf6071a2324f03ceb33c1249", 894, 893);
const OfflineImg = legacyR2ImageSlot("95f7c9cd9d8724bf3243975f739ea3ef507d2d8e5c38a8d862cfcc96f6ffc959", 894, 893);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("e36b0d0e9bdf00ee55f6df147053e7e3d53a5bb8ed5431257f198807dbab8e13", 4000, 2250);

// Additional images
const ImgNis = legacyR2ImageSlot("739e89f2cb3d974fad01463c7eb3c6b87393aa3b137602906babbb7affe9dbbe", 4000, 2250);
const NoArtistImg = legacyR2ImageSlot("0e2c119bc9cdc81b23ddbf52a56f67ccd8c1d9dc11efd75d78833cf38f27f2a8", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    dayBlack: DayBlackImg,
    dayBlue: DayBlueImg,
    online: OnlineImg,
    offline: OfflineImg,
    profileFrame: MainProfileFrame,
    img: ImgNis,
    noArtist: NoArtistImg,
  },
};
