import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const Artist = legacyR2ImageSlot("6541160123867585f9fa35d74077d139d5bd2c1630b937fb95bf0f1098113c63", 4096, 2304);
const FrameImg = legacyR2ImageSlot("4613d1faebec9e589b4888b360539dab281a5096cf70963b50e58b836829b9e7", 8000, 4500);
const Offline = legacyR2ImageSlot("e726a6d809ecc0a89013b4aa4a08179d4897b8f3f49c8bb849eabb4ea7c1d0d3", 2110, 210);
const Online = legacyR2ImageSlot("093a05896e2532aea456b03db39681acdc595ae5ea018b922d42dd6d51a501f2", 2110, 210);
const TopObjectImg = legacyR2ImageSlot("e3aae6c998ab3c8e0ab1b0d2b941f849db13a80fcebb01e27c63233c256f18cc", 4096, 2304);

export const Imgs: ImgsType = {
  first: {
    frame: FrameImg,
    online: Online,
    offline: Offline,
    top_object: TopObjectImg,
    artist: Artist,
  },
};
