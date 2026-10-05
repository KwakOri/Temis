import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("0c039a2f886eb6f71116a9f01e5adbc7684716a30965c966421803c4886df1eb", 4000, 2250);
const MainImg = legacyR2ImageSlot("7f4ee1b5bd45df49ac6b8b63298592c24df0bdc2ee9cdca7fc614d3c583a5be7", 2309, 2309);
const TopObject = legacyR2ImageSlot("b4c548b9c507d2e0465cc4b9e3bd5bcbf3a8cc95d893745b8974d5d388718b74", 4000, 2250);

// Online/Offline images
const OfflineImg = legacyR2ImageSlot("bcb28b51129044b6397eb67e0208d01bac3fc487182e2b216e172a73659840f0", 633, 412);
const Online2Img = legacyR2ImageSlot("b92adf934d69f105d482cc689921df095d2492c9926803b7550ea8ab0c61fb47", 614, 662);
const OnlineImg = legacyR2ImageSlot("af774581a7e0dc2b716a436de1bfe372a38c813129602e59180553a133768cd2", 615, 671);

// Profile and additional images
const ArtistImg = legacyR2ImageSlot("c7a1221f9f799c52b9895ec9c508d40e90d81b9f80e031380610a8846a97cafd", 4000, 2250);
const MainProfileFrame = legacyR2ImageSlot("b55c6616814725925fd9673b09d714f86dc97b14c4d6d4a0114abc582510f45c", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
    topObject: TopObject,
    online1: OnlineImg,
    online2: Online2Img,
    offline: OfflineImg,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    artist: ArtistImg,
  },
};
