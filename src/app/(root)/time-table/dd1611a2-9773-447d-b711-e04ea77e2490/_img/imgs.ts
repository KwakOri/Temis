import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("17042de6bd2cc11f19a7c684d33c8499c12abd0d72ce7588a6124e82dbcd824b", 4000, 2250);
const MainBG = legacyR2ImageSlot("c0d5e93b31037e3c0b440174c28cab4d5a5c1941664d429f4e352882658a6a04", 4000, 2250);
const OnlineImg = legacyR2ImageSlot("68f5171ab1c4584e3677a6baa3c103553e274f6bcf83e49b4779095ce3283841", 757, 510);
const TopObject = legacyR2ImageSlot("c47ff90bf8cc06ea945fde9586d912f87939d0a393a0293122d73e5f87464a11", 4000, 2250);

// Offline images
const OfflineImg = legacyR2ImageSlot("7e10ef0c43fd40f720f1351b6e4b9d55088519bf526a4d40c7d1ee5dbb6fc7cd", 757, 510);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("5d5f847d739f92abafb59f14b16b8b1ff5f4308b70fb0c978f8d3e6699b24c53", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    online: OnlineImg,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    profileFrame: MainProfileFrame,
  },
};
