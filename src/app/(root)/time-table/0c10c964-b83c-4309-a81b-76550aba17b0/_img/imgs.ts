import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

const ArtistImg = legacyR2ImageSlot("cbeda9939710c8acdee7d01ade7299307420dc9374ccef3e8945f06df315b462", 4000, 2250);
const FrameImg = legacyR2ImageSlot("1acded308181608ec05eca1c2d3434e0b09f6e596b4c24ee891b132f25a14fc0", 4000, 2250);

const OfflineImg = legacyR2ImageSlot("7b69c9fbf984504a92cd0d2210cf41c7110cbf877c0a2e49d7550cecb3e38f29", 781, 700);
const OnlineImg = legacyR2ImageSlot("29dd283fe350d81d1fdb99f1efd4d4a2aa5736ec5e2f8c32a0bf7b03104d44f5", 781, 700);

const PlateImg = legacyR2ImageSlot("2c723639ff62ba26cf4346a3dbf54a298deb1da1d30d0e2b814e27615144d45b", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("75aac11126d07509af0a3f18207e9d55d5d5f3519ddfedba255663bcc00872aa", 4000, 2250);
const OfflineFrame = legacyR2ImageSlot("f3e05b8bb8a22861348b4dd64a1ffb7e34900315a0673f2ca5aa4d09f2856b8b", 781, 700);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    frame: FrameImg,
    plate: PlateImg,
    offline_frame: OfflineFrame,
    offline: OfflineImg,
    online: OnlineImg,
    top_object: TopObjectImg,
  },
};
