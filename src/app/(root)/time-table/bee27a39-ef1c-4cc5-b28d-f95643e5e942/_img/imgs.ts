import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const Artist = legacyR2ImageSlot("6e9ecb36466beac5bd8928ad0ade699ce75361547c15b112631537f48875d18c", 4000, 2250);
const MainBG = legacyR2ImageSlot("bff7c467b2b7a9e5a5ec989582b017986688dc83d3c187eec25e332d9726a67c", 4000, 2250);

// Online/Offline images
const MemoImg = legacyR2ImageSlot("83a766eab410375ac9f3a75ba89e40d964ad3ec2bb14b351c43128366f2d73f4", 800, 617);
const OfflineImg = legacyR2ImageSlot("34a52dfc9397299cadf9ef4badec995b9311603a936314f7fc6ab8c48b0a7e96", 800, 617);
const OnlineImg = legacyR2ImageSlot("d03b1f434c6744972b3559dbcd7a7d90060312b652223fe7591cdc2b1c200780", 800, 617);
const Online2Img = legacyR2ImageSlot("1054b32358bda4425b250538100a34284797d3da330d04f6d63ed2f70af8c3f1", 800, 617);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("d7946bddc487296e71c1989d70f3e965a845e31c3dea50c7ec567fe35e8ae545", 4000, 2250);
const TopObject = legacyR2ImageSlot("7d4d37251fb1a06f99f8c83aec11a9db32ad13447137129fc8f7f05d1ef3ea1e", 4000, 2250);

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
