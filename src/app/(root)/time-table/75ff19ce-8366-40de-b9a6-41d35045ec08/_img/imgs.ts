import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const BoardImg = legacyR2ImageSlot("0e6a2ce4844b902dc7696a2218405b5a55c4a335bae8505d2e2b6f1f707c7019", 1920, 1080);
const BoardBlendImg = legacyR2ImageSlot("ba0b3bd0d815cf2658cc46e03e08b814433cdd1be4603cb926eaa56363e0ef0d", 1920, 1080);
const BoardFrameImg = legacyR2ImageSlot("44b6d5bfe3fe2403c23e3bd2e8c48222af57f6872c89941a78a24537680a6291", 1920, 1080);
const OfflineAImg = legacyR2ImageSlot("61192b701fd99f1d1943340dc57c5152b89af0d058df1030d3c8a1e6429bba61", 400, 200);
const OfflineBImg = legacyR2ImageSlot("1dcdc84e5fe0a204a3cbdad73df99ca145e270bec0805c8270b2fb9b828ba09f", 280, 280);
const OnlineAImg = legacyR2ImageSlot("da8364ff0e4910a1979d80de391898278a46da65f8122cf016015e971bbea114", 400, 200);
const OnlineBlendAImg = legacyR2ImageSlot("3c38a00776a09ab7e605c6a163228b3a4d5dd792be75f5b233c0ff82fbf2833b", 400, 200);
const OnlineBImg = legacyR2ImageSlot("7cb8c76620db7f1ce0a4906ebe5a29f2c57df9a80e2d27dd86b9508b4bc3af6a", 280, 280);
const OnlineBlendBImg = legacyR2ImageSlot("db361b974c7706883732f9d812c5bd79fdb7522e1b4df407a109e03137f875c0", 280, 280);
const PlaceholderImg = legacyR2ImageSlot("f0193e01b2eec0704167dfae9fc66005c1901444febcfddc194bb036c71e67e2", 1920, 1080);
const ProfileImg = legacyR2ImageSlot("961396812b24545b15ecc13795917a40372501e809a30cd5c4160986d43f9604", 1920, 1080);

export const Imgs: ImgsType = {
  first: {
    board: BoardImg,
    board_blend: BoardBlendImg,
    board_frame: BoardFrameImg,
    profile: ProfileImg,
    offline_a: OfflineAImg,
    offline_b: OfflineBImg,
    online_a: OnlineAImg,
    online_b: OnlineBImg,
    online_a_blend: OnlineBlendAImg,
    online_b_blend: OnlineBlendBImg,
    placeholder: PlaceholderImg,
  },
};
