import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const BgImg = legacyR2ImageSlot("6d2fdde1e6c8f14787ab2208cccfe07584d219702955fb6c70264ed4f4e15298", 1920, 1080);
const FrameImg = legacyR2ImageSlot("f99842c3009582c6d1326ac46ed070f41b92b0ca7ec298df219864054243745f", 1920, 1080);
const MemoImg = legacyR2ImageSlot("7477bebc46f3ad3e4409bff48ff809d9c0060f2f4057e4b654e44c1443981ac5", 1920, 1079);
const OfflineImg = legacyR2ImageSlot("75b12fccc5ba31b0019ebd86fd5cfdd5e47bb4f5b23c096e482e292634f5f5ba", 300, 300);
const OnlineImg = legacyR2ImageSlot("a0deffced58dbf115b39f9fcce96cd447c91d4d4de6c97e8f33a0884ac05843e", 300, 300);
const TopObjectImg = legacyR2ImageSlot("311afe9f25f55fdb41721ef653598b1e1386d353376a03ab1ed86da489d71bc8", 1920, 1079);

export const Imgs: ImgsType = {
  first: {
    bg: BgImg,
    frame: FrameImg,
    memo: MemoImg,
    offline: OfflineImg,
    online: OnlineImg,
    top_object: TopObjectImg,
  },
};
