import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

const ArtistImg = legacyR2ImageSlot("4d3e3b34ea63a61e2920a0987adc215358a8980e5a53b06e49cd6f68675b585f", 4000, 2250);
const BoardImg = legacyR2ImageSlot("b6bb6815d5c5be73ad0d8533659fd14f8bdc28dec0714e36421022e954315ca7", 4000, 2250);
const FrameImg = legacyR2ImageSlot("cd6418cf527cbe7cab7c9fe13a5e9df53a1ced5c9987bb652f4a05576570fcbe", 4000, 2250);
const MultiImg = legacyR2ImageSlot("16d1c8b4028c2fb5ea8d2661dfcde3e1ba04786adee68c8140b900ea38be886b", 580, 824);

const OfflineImg = legacyR2ImageSlot("7b9cbf552c4772bc8c732067da3811d3b89700c0bb92148db7c39c5f26383fa5", 580, 824);
const OnlineImg = legacyR2ImageSlot("16ac70dd8d38ca9a5c63aaebe3ebfb02edc587c0c89a576db4d62a02f3472834", 580, 824);

const PlateImg = legacyR2ImageSlot("44d08430260bd43ec8c2611d9d92893115e367a7d2cd57bcae82f84eafccb503", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("087a3a969bc58965cb1c7fe1870fcd4506a4f2faefa84dbb638ceddd76e39f5b", 4000, 2250);
const WeeklyMemo = legacyR2ImageSlot("bc799fd279d045a6971bd37b962370a3b443b67c15d2200b8a5db1ba7abf986e", 580, 824);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    multi: MultiImg,
    frame: FrameImg,
    plate: PlateImg,
    board: BoardImg,
    offline: OfflineImg,
    online: OnlineImg,
    top_object: TopObjectImg,
    weekly_memo: WeeklyMemo,
  },
};
