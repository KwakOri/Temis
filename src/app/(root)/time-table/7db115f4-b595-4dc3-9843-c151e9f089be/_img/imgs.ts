import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("b6f3388a567a9688a7693dda8f382352eae38d35ff9b2127737f63109d32c28b", 4000, 2250);
const MainBG = legacyR2ImageSlot("ee44651aad4d3367e08c2a140e6d71882ffa737ebffe44f10d9f50ceb2040469", 4000, 2250);
const MainFrame = legacyR2ImageSlot("0c355fc28a3046dd4aa14d939d4a189744e16bd8d6ac7a2e39cd9b7d8bb115d8", 4000, 2250);
const TopObject = legacyR2ImageSlot("7f8b8e0691c938c5f88ebeec644ac46499b40d718b978c6a500d2f2547f1db89", 4000, 2250);
const WeeklyMemo = legacyR2ImageSlot("d824c3a49a77db77c200fff51adb3e3c9c59913758bc47e467d0a6ba809b0949", 900, 700);

const MultiA = legacyR2ImageSlot("23bb32717572a3f47ce27d3437a66190319c1ffab4af9ba66278bfb012d020e3", 900, 700);
const MultiB = legacyR2ImageSlot("e874607de6fb585a38ff69388059f88811528712c3fa4770610039afd265f159", 1800, 500);
const MultiC = legacyR2ImageSlot("9aea74b534bdd72089624e74102d7eb8733df3a3549889add5c38595d90b219c", 900, 500);
const OfflineA = legacyR2ImageSlot("54a5bca0d56ad09eada72b1b80d6d4d557e5d69264aecf55e83fdd27434bdc07", 900, 700);
const OfflineB = legacyR2ImageSlot("16318330062a30d78e78e8e3ff131a2f3a7cb8efec813cdee4802b3daede764d", 1800, 500);
const OfflineC = legacyR2ImageSlot("a598744dcfc13f6993a49353739e73ccb8b74d5323f5521a2a36093f9102d625", 900, 500);
const OfflineMemoA = legacyR2ImageSlot("1b2ef7657e914d572b7d0e68d2fc66a118241e4bbc9817c7406c35cd08165585", 900, 700);
const OfflineMemoB = legacyR2ImageSlot("fedf26c685751eb81cc11d93bfe763bd38bba87b20bb26101a4b61b741cd660c", 1800, 500);
const OfflineMemoC = legacyR2ImageSlot("e4169fba425ebd160508e2358744dce8a5095cd572ff0e031a690cd98026025f", 900, 500);
const OnlineA = legacyR2ImageSlot("f5932aea74037d5360b33908ea19d170322ec4a9a67cd9b6230fcbefd40eec73", 900, 700);
const OnlineB = legacyR2ImageSlot("60fa13cb8080427b74f403d3ab3cd00cb10b61a56625aeb2356cd2b177675997", 1800, 500);
const OnlineC = legacyR2ImageSlot("5f7adbb2f5341e705f22700179bc9fef92398c936e7a3ec75db111be8bea603f", 900, 500);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    profileFrame: MainFrame,
    weeklyMemo: WeeklyMemo,
    a_online: OnlineA,
    a_offline: OfflineA,
    a_offline_memo: OfflineMemoA,
    a_multi: MultiA,
    b_online: OnlineB,
    b_offline: OfflineB,
    b_offline_memo: OfflineMemoB,
    b_multi: MultiB,
    c_online: OnlineC,
    c_offline: OfflineC,
    c_offline_memo: OfflineMemoC,
    c_multi: MultiC,
  },
};
