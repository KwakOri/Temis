import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("1a9d36acc06704da9579f0e298d1882510a44289f0e5370a2daff4d79557d337", 3998, 2249);
const BoardImg = legacyR2ImageSlot("175d9593c2162e055fe19f8e64e963f64452a178393c166de1772ccb2a6b463f", 4000, 2250);
const FrameImg = legacyR2ImageSlot("530f2af2e75f323827f88d5d25435ec86a480bb132944595ed63c8a1bfcda8e5", 4000, 2250);
const OfflineImg = legacyR2ImageSlot("fcb2b3bec67d331607bffe5785330bba4a158540a18fcdf34ed20f961ae16bd0", 640, 660);
const OnlineImg = legacyR2ImageSlot("e5eb180b882fe660b8a7c8f21f9cf37ba434fbe5e417c6d5c1b899cd12dbedba", 640, 660);
const PlateImg = legacyR2ImageSlot("0b06286c3148976c03de98a5af28cf7144c1a240453d1f810a6f7bb880c75e8a", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("a8403df9749ea0aa155da59e4f932baa40af36dc3f9c4a5aded26bd746d01e1b", 3998, 2249);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    board: BoardImg,
    frame: FrameImg,
    plate: PlateImg,
    offline: OfflineImg,
    online: OnlineImg,
    top_object: TopObjectImg,
  },
};
