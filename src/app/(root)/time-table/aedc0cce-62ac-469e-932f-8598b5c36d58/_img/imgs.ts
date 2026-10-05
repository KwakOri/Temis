import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

const ArtistImg = legacyR2ImageSlot("e224f50bf07c0f613b01c606d9c812b8c4957da19ee62da12a4f7928a7f2defa", 4000, 2250);
const BoardImg = legacyR2ImageSlot("b2d485536dcad94692c3685499600735be9bfe9d5431611ae56f506f3e3f9889", 4000, 2250);
const FrameImg = legacyR2ImageSlot("332c09753858709fe7e7f8d4282099ba5746390c27a05d10891aa6b7f40df6f9", 4000, 2250);

const OnlineAImg = legacyR2ImageSlot("27b4e65fbd0019d201841dde28d429d5bf361d588b3a7e4d7d6dbdc9e3c9b495", 940, 780);
const OnlineBImg = legacyR2ImageSlot("becdc975ee1b97c9879ea276feb5b6054e1771cb7c0b01fab42caf0d2b48429e", 759, 749);
const OfflineAImg = legacyR2ImageSlot("6f3e486604204699ca37e40657efdb15693f00462a5cc0410dee7f99d1e09e64", 940, 780);
const OfflineBImg = legacyR2ImageSlot("7f0b4210f50289396361319921f558fdcd37783ec359cebdd294dccafd309088", 759, 749);

const PlateImg = legacyR2ImageSlot("20b758910aa4833c37520dd89191f8be6fabac1f001a93d7791e71a0aae88832", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("65abaeeb834442a880ccef2269ff848fcb39497edaeea3e168c8291301da0b66", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    frame: FrameImg,
    plate: PlateImg,
    board: BoardImg,
    offline_a: OfflineAImg,
    offline_b: OfflineBImg,
    online_a: OnlineAImg,
    online_b: OnlineBImg,
    top_object: TopObjectImg,
  },
};
