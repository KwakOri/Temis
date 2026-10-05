import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
const ArtistOff = legacyR2ImageSlot("1f99dc6f1281734eb8437894c3ac48e0455ba2cd2701b6f609dcb4f15d710bbc", 4000, 2250);
const ArtistOn = legacyR2ImageSlot("a71acee41e7f537fee16cfc1c8c09a9c6c2258c1bc55b407ab032c5feaa6fcbf", 4000, 2250);
const MainBG = legacyR2ImageSlot("905cac3a3fc4bd72b489569b816240414e60dc65a0dd6e5bbd4a0bf23aeb0075", 4000, 2250);
const TopObject = legacyR2ImageSlot("0db7521c6f22c16b5f37db83009f796a7008ab723235e806c8bac4201130a921", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("a85bf0d7f10f123132b287159891e13ec2ec1a78db8e7fbb9d43121241d53078", 780, 600);
const CardOverlay = legacyR2ImageSlot("9ad67b2ea6f6b947970f3eccc5d12a5bd5126a50f6e9ebb70a5f2a4255e9a943", 780, 600);

// Offline images
const OfflineImg = legacyR2ImageSlot("f1a1288b9726e96742c532fac0049311ac057b92fc88c7823d4fd1cc907c8a1d", 780, 600);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("b9dbcbfa2f85f3992b6e17768c07eecafb9dc589ec5b27e50363a73f73728034", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist_on: ArtistOn,
    artist_off: ArtistOff,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    online_overlay: CardOverlay,
    profileFrame: MainProfileFrame,
  },
};
