import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const a_multi = legacyR2ImageSlot("550aea3e7551f01b169b81ca6816a4a346aa9a3027f5f1b3ecca3f0d9630fa99", 1002, 774);
const a_offline = legacyR2ImageSlot("9133e79bd29b08d869a2ec494b765d5e9730496c51377b9f7a564b88d2a9130b", 1002, 774);
const a_offline_memo = legacyR2ImageSlot("61e8254a52408e3c5c46e2480084c4957a4b4418cedd74522f867db610e610a4", 1002, 774);
const a_online = legacyR2ImageSlot("b6cd1cc71f37094422942055e53a9c36e97852f9762fbb862cf43463604c72a1", 1002, 774);
const artist_off = legacyR2ImageSlot("bb31b4c5f04244b93ba93a8262cfd3076b1faeac9fbb81fdcd51d4547ebbe073", 4000, 2250);
const artist_on = legacyR2ImageSlot("860727b50d75d160f1bedb58c8c49c8dbeaad5a3dda841c3ea320a1c52a40046", 4000, 2250);
const b_multi = legacyR2ImageSlot("1e0f882ed9aabedfd4a7d671ab6cc5cd84d153b9339541c8d7d58201d11e46f7", 1160, 338);
const b_offline = legacyR2ImageSlot("4ba5abec2a7a83eafaa1cf4bb891b0eddf4c55313ac690a34f792ad01c20bebb", 1160, 338);
const b_offline_memo = legacyR2ImageSlot("24f00635c1454635ee077fd17322be8c67f60a87a8e08a73e4e39b47af1aad3c", 1160, 338);
const b_online = legacyR2ImageSlot("22a1dc016eb8cb17f08a16ab15c370a86fb49247597cfedf2cc0f8dc6104cd3f", 1160, 338);
const bg = legacyR2ImageSlot("d11abaf28be96dc781e7e9dcf9bca545eed4013e8de87cde73e7196f46b055b9", 4000, 2250);
const frame = legacyR2ImageSlot("e355888f7b7b57b4389c07bbc89124b6cec79f994f333e8dbf75b0e60f52863c", 4000, 2250);
const memo = legacyR2ImageSlot("1dfd29c39180978d6c9e81d0f506e61b79d8949e7b1527298dfd8b577a60f02d", 1020, 338);
const top_object = legacyR2ImageSlot("7b480431ad45fb24cc852988ff820f867e5674b51ed1142573bebb6bed710933", 4000, 2250);
const week_dates = legacyR2ImageSlot("08c93d21507b0e26821c61c26bc601ff1503e21ae824fe99bb1f1507314321d3", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    a_multi,
    a_offline,
    a_offline_memo,
    a_online,
    artist_off,
    artist_on,
    b_multi,
    b_offline,
    b_offline_memo,
    b_online,
    bg,
    memo,
    frame,
    top_object,
    week_dates,
  },
};
