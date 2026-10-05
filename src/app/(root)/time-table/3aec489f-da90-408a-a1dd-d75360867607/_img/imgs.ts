import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("2fe13b6a4d83f8e86861fca29ec0e84934db0d7940cf1f55f268aeb1e1348336", 4000, 2250);
const FrameImg = legacyR2ImageSlot("55ba24c06ca935b32352a89b154d766b5bb5d91676956994cf82deba7f0f9ff8", 4000, 2250);
const OfflineImg = legacyR2ImageSlot("ee63c02608d2744a6afa7787e68d1a7f6f3176793a91e514f05be5c37e90fcee", 512, 888);
const OnlineImg = legacyR2ImageSlot("cd8e225598fd7e19a832c59c99e77e87bd8fb17d68730f3648c9a1a7af894d76", 512, 888);
const PlateImg = legacyR2ImageSlot("041f1b52926150e9eb09c454d2691db23b6b5bd3a32bc12febfc762b5ff2fc66", 4000, 2250);
const WeeklyMemoImg = legacyR2ImageSlot("34c1debddc5b76ec9bb7adf03da63708fe4853309a18d2fd4efbac503d01d069", 512, 888);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    frame: FrameImg,
    plate: PlateImg,
    offline: OfflineImg,
    online: OnlineImg,
    weekly_memo: WeeklyMemoImg,
  },
};
