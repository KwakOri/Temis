import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("abb4bcb6d9f957714ecb816b51ce6d9186079ea91b47c2ad4ee315a579e7950f", 4000, 2250);
const Artist = legacyR2ImageSlot("e9df1e0036ff9c65bbc761291f00c74881dee9fa47849a75baab9ad9cdb4276f", 4005, 2255);

// Online/Offline images
const OfflineImg = legacyR2ImageSlot("5b72f4552fa2cee2729fa5348efaca61fd601958c720ee12c4f8c72d87e898f3", 653, 538);
const Online2Img = legacyR2ImageSlot("e9365badac1b454ce24c9be22bf9b2baa6e82400cb070ff0ff8840390615e500", 653, 538);
const OnlineImg = legacyR2ImageSlot("a7022293c2d94273df709b6637a0d8725e6c7280357a2e020e0459c553a1447a", 653, 538);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("ab6515a3bba1af03d6ecc588d560bc99a3d1cb20034f9f62f414895dc8227169", 4000, 2250);
const Star = legacyR2ImageSlot("0224d123a3cc177d0b13ea5e4b602bd45b4b2dc2b3c8fcd12f9b2c54a4669e1e", 512, 512);
const TopObject = legacyR2ImageSlot("c32ce8e8e6dc7fc047d16a073620ff5e1cf53f886e445ade13935cb8ede3ad46", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    star: Star,
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    bigOnline: Online2Img,
    profileFrame: MainProfileFrame,
    topObject: TopObject,
  },
};
