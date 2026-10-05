import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

const ArtistImg = legacyR2ImageSlot("e1e02345d32439a3615a1a8c78a792b3905fbb34c1c9878de9f450a254a9a51f", 4000, 2250);
const BoardImg = legacyR2ImageSlot("143fc7c5fbd706bf02fc87d5a26403bd5e20ee2d3594bb7f543181c5475dacb1", 4000, 2250);
const FrameImg = legacyR2ImageSlot("7661492a663efa9a8f99ea92adc53e50c5af5718f18a34daa1dcdbd5a6cd78cd", 4000, 2250);

const OfflineImg = legacyR2ImageSlot("55f14ae9c9dcbb28235ea6e813a3d1bb25fb82cdcddd0d07ae0bde03bb80b042", 940, 460);
const OnlineImg = legacyR2ImageSlot("08f1bb12be4da5e863a0ab1595113caf5a8dcb0ce9cc8e64a328198524d00f3e", 940, 460);

const PlateImg = legacyR2ImageSlot("c76f90a6220fe9f70ae6de839a10cc68a64323ac0e8ccff0b5dcf817cadee4bf", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("a24fe63f8d3b727d430e0a9a373d98a402c4c28bc59891a7d9bb860619ef48c1", 4000, 2250);
const WeekDatesImg = legacyR2ImageSlot("3260bd45b1e512f409d1c35e2626b1c2a35fe4c2fae37ae9f7755b567f09c005", 4000, 2250);
const WeeklyMemo = legacyR2ImageSlot("19b897dbb52cff79ece48ab2388dc792428f5b88920e6ccf8a77d52450d2f620", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    frame: FrameImg,
    plate: PlateImg,
    board: BoardImg,
    offline: OfflineImg,
    online: OnlineImg,
    top_object: TopObjectImg,
    week_dates: WeekDatesImg,
    weekly_memo: WeeklyMemo,
  },
};
