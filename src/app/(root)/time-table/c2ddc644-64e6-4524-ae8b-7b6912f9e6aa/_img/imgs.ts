import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Main images
const MainArtist = legacyR2ImageSlot("37aec1c12dc52458334d4e398300ed2d87e13a7cd5e261b41879726331a22086", 390, 87);
const MainBG = legacyR2ImageSlot("608185a9ec8e5542282070593ff215118a41577210751757ca805e4eee585376", 4000, 2250);
const MainOffline = legacyR2ImageSlot("96cf4eb2dcdc301fe80571e9537ecbf1802e6cd4137d2f16d86875a623063e13", 728, 657);
const MainOnline = legacyR2ImageSlot("dd3befc764387affe296da519cd912ff66ec67fe5d76805840600d2278f6e647", 728, 644);
const MainOnlineTime = legacyR2ImageSlot("a357d9e7154e2a0edd9371fa6cb598d8e082fe124cbd4db8cd2795438d25f394", 326, 90);
const MainOnlineTogether = legacyR2ImageSlot("be27a8e63f72c5a87e751d5c27002bc654b7a0bb64da0edb5de4b7d5455b83fc", 728, 645);
const MainProfileImg = legacyR2ImageSlot("7d5394c5cf8f9d510add4e3c2dd5b6360e4b925de8ddaf1723eded6c0a817bf7", 2035, 2829);
const MainProfile = legacyR2ImageSlot("ab4aa5af46c03dcfc4a0f52da101cd2a7eb1ab954bac5b784a96685a8235e8b3", 4000, 2250);
const MainThumbnail = legacyR2ImageSlot("bd8f1508070d795e469bede1ce3c6117c4652f4ed08fbd88823b1aef3a9fb710", 640, 360);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    onlineTime: MainOnlineTime,
    onlineTogether: MainOnlineTogether,
    profile: MainProfile,
    profileImg: MainProfileImg,
    artist: MainArtist,
    thumbnail: MainThumbnail,
  },
};
