import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const BoardImg = legacyR2ImageSlot("8c4f07c34e71ccfc5c33555bff75de4aff6fb72a6b14244a0509e28c4f620d5f", 4000, 2250);
const MultiImg = legacyR2ImageSlot("7373178cbca0c6f9ebb57eb671e369fdbc2de746595b9e6820bee56aeabd7811", 700, 520);
const OfflineImg = legacyR2ImageSlot("ea7b70fd6af7c8d57b19a3ea11ce01ce7085cd465045b0b0b91de421e64fe79c", 700, 520);
const OnlineImg = legacyR2ImageSlot("c24ed7333974942176470a5d6d47c9202e87c0c2ad0b87c2ca57e31168f82739", 700, 520);
const ProfileBoardImg = legacyR2ImageSlot("f66e278040445d794326349701523557a3f50ddef6e973dcf76e77ac5e61f990", 4000, 2250);
const ProfileFrameImg = legacyR2ImageSlot("c27d71036e33bfdde2b2ded8f402b242617681d7c3bb1f2856b0154016dcdac9", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("10a0b2982162c5c65fb07c32e811072065bd25737bbcf3fae6b36fac59e3eca8", 4000, 2250);
const WeekDatesImg = legacyR2ImageSlot("c61037c2fcda349fb2e76ce569832c5328cfc5aa328352ee11be8996ba52827b", 4000, 2250);
const WeeklyMemoImg = legacyR2ImageSlot("9cd25bd5514cc527df77542ef964c6badc7dab074e0eb5a77c6c2777259a84f8", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    board: BoardImg,
    multi: MultiImg,
    offline: OfflineImg,
    online: OnlineImg,
    profile_board: ProfileBoardImg,
    profile_frame: ProfileFrameImg,
    top_object: TopObjectImg,
    week_dates: WeekDatesImg,
    weekly_memo: WeeklyMemoImg,
    memo: WeeklyMemoImg,
  },
};
