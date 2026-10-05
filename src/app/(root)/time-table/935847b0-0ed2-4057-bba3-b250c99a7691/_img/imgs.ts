import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images

const MainBG = legacyR2ImageSlot("f37b7e96d39fe4a30c2ddc6baafb1dfd1a77d425974906330854b7a8fb0ce7f7", 4000, 2250);

const Artist = legacyR2ImageSlot("f9965b4a0b0b0e68a0e4381d1df2ecd8594bd12af64d020dd2af92ecfea2c0c4", 274, 91);
const TopObject = legacyR2ImageSlot("396e37482a791fa705b0aada557834661d3b2f25f5db22134716a467e6961d02", 4000, 2250);

// Online images
const OnlineFri = legacyR2ImageSlot("c50e4c0687dd9032240a67dbaeb057e26c5b9dcec5c1f6d58975da9d0f32300f", 799, 891);
const OnlineMon = legacyR2ImageSlot("08aeea3de235071554c15dcd6f4075a8cb45e2bce7dfbef090b6b12efef1742e", 799, 891);
const OnlineSat = legacyR2ImageSlot("d3cc03ed61cf43115d83e34471c5ad73ec5c7c735f37e02c7b1e3560ccd4d68e", 799, 891);
const OnlineSun = legacyR2ImageSlot("d0d37714bd6e9baecea70fa6e1e6658308f6d3a5c02ba2079495b16e943cf18a", 799, 891);
const OnlineThu = legacyR2ImageSlot("9872f8e8f99237ba65640edbc24dea278bc2243d49178fa040f8fb050cd0dd6a", 799, 891);
const OnlineTue = legacyR2ImageSlot("8e9d12539b6777eb1dcd776628953b978175054870e3fad57c8918ff7dba6fd1", 799, 891);
const OnlineWed = legacyR2ImageSlot("0e0269ca4bdc7b802334097178402fd573bb37becab6cc25bf704c9cd773ae51", 799, 891);

// Offline images
const OfflineImg = legacyR2ImageSlot("c3e94a29a5b0714114726cf6f1f46cbe2bd9ce5826e7ed6fed96538c9915e424", 799, 891);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("b85a28acdfeb35f67faf7df60dcc7905ba44aaad3d3a2afa1a25f8657f7be9c5", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    topObject: TopObject,
    offline: OfflineImg,

    mon: OnlineMon,
    tue: OnlineTue,
    wed: OnlineWed,
    thu: OnlineThu,
    fri: OnlineFri,
    sat: OnlineSat,
    sun: OnlineSun,

    profileFrame: MainProfileFrame,
  },
};
