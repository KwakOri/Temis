import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
// import ArtistImg from "./main/artist.png";
const MainBG = legacyR2ImageSlot("78b87a3af49bab2145cccfdfd98d0d3ed624bc378dbe717b49db75cd1f4ef194", 4000, 2250);
const TopObject = legacyR2ImageSlot("4a7ef96972c5ef2aad61d024e0b8eab096b721ce25afc78ca185244d04e9d1fe", 4000, 2250);

// Online images
const OnlineImg = legacyR2ImageSlot("a95083a5da0342c5d42656ffc521ec2009eec021427c8d06d5167d51a9bc7f72", 634, 558);

// Offline images
const OfflineImg = legacyR2ImageSlot("290c73ae68206525f46641ebeac71eeaa805f14ff2a04304691349979d7f9955", 634, 558);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("6d83a88d77de43bb0dcb58e22bced4690923f7b6257455e89dbbc5320fa06ec5", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    // artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
  },
};