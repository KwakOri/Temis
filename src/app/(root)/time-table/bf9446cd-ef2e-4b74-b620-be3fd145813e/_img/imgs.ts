import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
// import ArtistImg from "./main/artist.png";
const MainBG = legacyR2ImageSlot("926b837cd0fdec9be376f2f9a6c1423c23606694305a202493f788ed392f9013", 4000, 2250);
const TopObject = legacyR2ImageSlot("5c4ca91268bbc9d99278082e6fd2e6b8d7492ee7dc35de4a7a4738e8f0befddb", 4000, 2250);

const ArtistImg = legacyR2ImageSlot("c2530aef6496ed3022b4db4e68dda4ad834ba8d2c7f747ed7cfed74ccf93988c", 4000, 2250);

const Multi = legacyR2ImageSlot("bcf87d9f2d33dd95bfd0eb2c52773489bd7818ae7af0d1a5a133472e4afbae04", 720, 712);

// Online images
const OnlineImg = legacyR2ImageSlot("79586ae50fba1237c54fc8f7222bd5e7f4655ffe3795de84ea209a2695c17940", 720, 712);

// Offline images
const OfflineImg = legacyR2ImageSlot("60dc58f1e9e4349bd6d47aab8bc7b00f4952ebaf1e48cb602b1b0b63aa8519bf", 720, 712);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("8c407f4128f9616fca0746f964bbdbf41cb6d191283b37d984f9a68c75b1c9dd", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
    multi: Multi,
  },
};
