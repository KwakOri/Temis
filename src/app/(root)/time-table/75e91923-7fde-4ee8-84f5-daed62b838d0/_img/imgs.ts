import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("17fa30aa4879f58f599405d8bf3d8904061d16af50d4825abf9cb090de29347d", 4000, 2250);
const MainBG = legacyR2ImageSlot("77238b35f476c7b817facb607448c7b9334c5f081ee4dd4fff69363b828c5adf", 4000, 2250);
const TopObject = legacyR2ImageSlot("940dc3312da7cf964235fb008d1e58d1d8354c668d67707e51fb6b3d22eda40a", 4000, 2250);

// Online image (unified for all days)
const OnlineImg = legacyR2ImageSlot("639a37aee2f4123e047ed941bcaf62267ad89d587ea15885f0749fbec9a0ed60", 1046, 917);

// Offline images
const OfflineImg = legacyR2ImageSlot("237d85c240a6bbf290a3d1836b581746ff607f600ac06c48a47e3ea0a7c30408", 1046, 762);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("1093751063993fa9e485d0c7f9842521d5680feb5a2de019c00dd1c338d3b664", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offline: OfflineImg,
    online_mon: OnlineImg,
    online_tue: OnlineImg,
    online_wed: OnlineImg,
    online_thu: OnlineImg,
    online_fri: OnlineImg,
    online_sat: OnlineImg,
    online_sun: OnlineImg,
    profileFrame: MainProfileFrame,
  },
};
