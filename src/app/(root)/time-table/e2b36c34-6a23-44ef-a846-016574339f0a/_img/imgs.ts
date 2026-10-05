import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("95bf725c94708548415f697fdb2a0a50e9ec1b1ffbe9a337dfc8aadc6652f61e", 4000, 2250);
const BoardImg = legacyR2ImageSlot("1fa414d06df4bb9932ae3611b43518c081cbd5c78675844db63361d98df226cc", 4000, 2250);
const FrameImg = legacyR2ImageSlot("2eb4b54b538ed32f8e4dec3fa1bb1c8bfa8aa70fd0588434c5baf9ba3b0d20e5", 4000, 2250);
const MultiAImg = legacyR2ImageSlot("9f4ca1c90280e483407610fced89ca8aabeca63d697eedaa83b2a17a7ad83240", 840, 700);
const MultiBImg = legacyR2ImageSlot("5121379f4cf8ffb5427cdec3b539a8f740911473243130961346796a6b63a0fe", 840, 700);
const OfflineImg = legacyR2ImageSlot("cd6f4d16eb71289aba877c11a90e25872d9d06fa55d8b270de3f2141a665be94", 840, 700);
const OnlineAImg = legacyR2ImageSlot("b5e2e51173f3424ecda543cb2f1d699674dea4415adb2b30d0a36dc0223b4f81", 840, 700);
const OnlineBImg = legacyR2ImageSlot("de7a33dba118c1c23244d5b476f7bb639f035868f7a43f898728b00a212b4fb0", 840, 700);
const PlateImg = legacyR2ImageSlot("7bd0713154a02c225d106d152443c07377eed5308c58bcd9f4c9bb4f195362d9", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("277e704baba47fba8c8596e26c2c4cee483acda2aaac7918b22e9276a9c2263b", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    multi_a: MultiAImg,
    multi_b: MultiBImg,
    frame: FrameImg,
    plate: PlateImg,
    board: BoardImg,
    offline: OfflineImg,
    online_a: OnlineAImg,
    online_b: OnlineBImg,
    top_object: TopObjectImg,
  },
};
