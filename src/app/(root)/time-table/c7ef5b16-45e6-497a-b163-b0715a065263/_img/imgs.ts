import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

const ArtistImg = legacyR2ImageSlot("715f87c9c7d0e3051da58d12d01a1584c76a7cc1eb47110bf691f1c3df72c1b5", 4000, 2250);

const FrameImg = legacyR2ImageSlot("897bfc47c67f235f532f75d43439a16533a214b03007ef8937e18a3e8cbd45bd", 4000, 2250);

const OfflineImg = legacyR2ImageSlot("ec1d7be3de2b8ed8a41c9657173e3cc3e963f0ff4f9a11754940435df98d4cb7", 640, 800);
const OfflineMemoImg = legacyR2ImageSlot("adb32787f6375577200788301a1d8850a40af199435aa3cd420620c2ddf3768e", 640, 800);
const OnlineImg = legacyR2ImageSlot("51b7cecbb57f4d2690d887449ad1e1bd3ab6673995f8f36dd81581fd133c6c49", 640, 800);

const PlateImg = legacyR2ImageSlot("7417f2e0e9579277e02c8737015aeae0e3323323cab80524ec56450042c7011c", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("402c91a3fc4077484af118ac3200aaf2bd1423d56780ab549365f50a0c8b3927", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    frame: FrameImg,
    plate: PlateImg,
    offline_memo: OfflineMemoImg,
    offline: OfflineImg,
    online: OnlineImg,
    top_object: TopObjectImg,
  },
};
