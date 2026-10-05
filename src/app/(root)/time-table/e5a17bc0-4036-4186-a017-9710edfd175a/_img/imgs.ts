import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("5443fb931a20a233b53a4f57530b00ea3983bbbe651427ca686712448262ac1a", 4000, 2250);
const FrameImg = legacyR2ImageSlot("9d5644d240b7da3bda57ec5a7ebf826d8aeae52496d3792c93a979595e894b67", 4000, 2250);
const OfflineImg = legacyR2ImageSlot("ded39f250aebfc5f38195416da41f5697e551bb90faf99c9875cd5f574bdee60", 740, 700);
const OnlineImg = legacyR2ImageSlot("84fc54c4f43702292db8666e3c231242b1197612a2c46f608af010b0508f0838", 740, 700);
const PlateImg = legacyR2ImageSlot("bb1692a1a7ebbb927ce7eaab56aa80ccc3cbbea1485b2b3b548944336437620d", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("b2d0b3dfd62b79efe5e27daf7fe5dd8de0c4d65573ca26d88e54c7f307f0ba5a", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    frame: FrameImg,
    plate: PlateImg,
    offline: OfflineImg,
    online: OnlineImg,
    top_object: TopObjectImg,
  },
};
