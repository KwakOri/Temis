import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("7503e8e644dd9ba7b29d954849d22936a26550a6c74522cf9f53f92564df6367", 4000, 2250);
const MainBG = legacyR2ImageSlot("f4b2c0d85426b51a154a49d0e51b51b8a4b65893c393c36a7ab90f08b58ff7a6", 4000, 2250);
const TopObject = legacyR2ImageSlot("e68c3866bab502dcd3cf4d0b6e99cd4446f68ea583730c273339d5781bbd3c46", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("19a4cf5424e8572e6b8d1f796bf417fff90be2bd6fcbf663c964a41c3a0c0550", 793, 698);

// Offline images
const OfflineImg = legacyR2ImageSlot("a9d4e3fbfac74f284e9dd87183794f02ea3edd13999b6271e72705c55b093652", 793, 698);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("2d899f884b4d6e2172d18565d94a5f97bb51f114057d1fe471ba8fe3cdad5f33", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
  },
};
