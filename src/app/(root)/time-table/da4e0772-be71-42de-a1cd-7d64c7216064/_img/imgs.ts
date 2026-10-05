import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("97a83c9cbc2f5818d9236b399a39e903341195d6b63b098282818dc19aa29bcd", 4000, 2250);
const FrameImg = legacyR2ImageSlot("abe6fa2b460d586538ed06fdac4a52c5d34b07dddacd55d72837564eaa691d6f", 4000, 2250);
const MultiImg = legacyR2ImageSlot("9a10be68996157f7c5a828a401c9271e1baa8f2cc3df0513dd0d07dd197b87ef", 832, 658);
const OfflineImg = legacyR2ImageSlot("44be4dee0375c3754c1ad6dd15901d568df72cc7acab211c0d18d7801b2864e8", 832, 658);
const OnlineImg = legacyR2ImageSlot("d7da476371d63bfe7660c4f6cf5f72448eacea27f9118e7889f37bc4aa0fcd13", 832, 658);
const PlateImg = legacyR2ImageSlot("3fd07dcc84840f96c2d15ab0fd4f57f5d5331b6886adc63f6e125f163dbe037c", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("ae2b434db84d7c979d55c4c27b4a9c96cb67d3179f54f669f5fd8a82a4a2d4ef", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    multi: MultiImg,
    frame: FrameImg,
    plate: PlateImg,
    offline: OfflineImg,
    online: OnlineImg,
    top_object: TopObjectImg,
  },
};
