import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainArtist = legacyR2ImageSlot("183b0560968861e9d9cd1437d569da4a7c743ce1ae39e0ae9cfe251ba09feb6c", 4000, 2250);
const MainBG = legacyR2ImageSlot("66c5e3a2919fa6569bb1836863a77e2384b8b08aa9de0774e54a30484a71f946", 4000, 2250);
const MainNoArtist = legacyR2ImageSlot("0f7fe17d667db0664fe74d3cb566ea1527fe753a9069d1ad3d109d18ea42e813", 4000, 2250);
const TopObject = legacyR2ImageSlot("b4f7783b1855829584a4c7c4d610cdb7e65cb95a7ff462b70468a357b56a425c", 4000, 2250);

// Online images
const MainOnline1 = legacyR2ImageSlot("c3fef75082bfa2c23008e58b87cca7a9b99ad9c469e48fde26d485e20f07a8b5", 729, 842);
const MainOnline2 = legacyR2ImageSlot("ffa140ed38dd2af9f495743d8d27f37c7a4192f7fbe867bc3a6046561151e554", 1262, 546);
const MainOnline3 = legacyR2ImageSlot("67aef9a89ae8c7106a4be502f8efd3f7cfabe65c6e701c1e995d09fbd071bd3a", 931, 535);

// Offline images
const MainOffline1 = legacyR2ImageSlot("ab2119c39aeba0b43ef0008d2489fee93f6429f0544d21c10750d89e326de7e1", 729, 842);
const MainOffline2 = legacyR2ImageSlot("72842a6a3f914b01b2b7ee47ca7425ae3cea6cbaa8603b297b61f414dbf990a8", 1262, 546);
const MainOffline3 = legacyR2ImageSlot("04b9f57325cb3b70b319fa4b5d46dd904a867f430f4f0577d960db9cd0841db5", 931, 535);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("db98707f3f43759898a3834e2babcebb6a6b8a0d9171a993de1d6af4336c2866", 4000, 2250);

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
