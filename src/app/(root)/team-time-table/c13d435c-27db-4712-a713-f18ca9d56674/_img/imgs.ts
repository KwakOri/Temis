import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const board = legacyR2ImageSlot("5f6b012b7a2fa1166f351b0f4586d0923439a37231c9eab8260486a5d6e4866e", 2078, 2215);
const frame = legacyR2ImageSlot("d70a9997a364cc0ac944b3258ad921ecdfc098db640b879868ad3fbdf7a3e461", 488, 780);
const hanyuel = legacyR2ImageSlot("0248cee560fc6ee9cbc700917d2df2aa8059ac7b601e091a15a533c43522d098", 460, 200);
const kumyamya = legacyR2ImageSlot("11ae32260cb38e770ff9ddc0ec8450fee99682031459e51b2e8cdcc1d0cdc1c4", 460, 200);
const nut = legacyR2ImageSlot("5e0db43c47e9ddb3946a350594f4ba69657a73d8ad32955c64491426b618f223", 460, 200);
const weekly_memo = legacyR2ImageSlot("9e838141a907a9eba5019f8917b9e47194c8c1ce8c7799687e69d67533975071", 488, 780);

export const Imgs: ImgsType = {
  first: {
    frame,
    hanyuel,
    nut,
    kumyamya,
    board,
    weekly_memo,
  },
};
