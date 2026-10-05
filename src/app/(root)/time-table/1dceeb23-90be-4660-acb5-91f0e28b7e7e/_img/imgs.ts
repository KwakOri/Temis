import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const Artist = legacyR2ImageSlot("08420f891de68f34f57e54b42c0b5bc6424bef101cc574992055021fc1223116", 4000, 2250);
const MainBG = legacyR2ImageSlot("d239459ed2938c6a1b5bcb4fede33df7042feac776b8dd8ad59df94c599f21f1", 4000, 2250);

// Online/Offline images
const MemoImg = legacyR2ImageSlot("1f1618dcd8318af5326be829573c15a9e2c061bf9d91e4e46a33d4aeaffca233", 800, 617);
const OfflineImg = legacyR2ImageSlot("9d7cf116ee42f7cef04a6827e42b8f1815036871ddb4467fc07edd6794fb28ce", 800, 617);
const OnlineImg = legacyR2ImageSlot("cbdc15c6e011ce980d311fb514b845d6cd20ceff0c0aa74ab16c3572e0ceba50", 800, 617);
const Online2Img = legacyR2ImageSlot("c6ec975c7ed310f1b3c2eb1ec641f8b97caed94ba06030977635d895b5561db3", 800, 617);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("876773d38289547403fd0a22998f1d37f9b60d77cf6f4da0bcbc82ca37d18b15", 4000, 2250);
const TopObject = legacyR2ImageSlot("81f71949db4206e3fd940fe1b93d28905991748256eea93be4c8fb3028fe1d30", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    bigOnline: Online2Img,
    memo: MemoImg,
    profileFrame: MainProfileFrame,
    topObject: TopObject,
  },
};
