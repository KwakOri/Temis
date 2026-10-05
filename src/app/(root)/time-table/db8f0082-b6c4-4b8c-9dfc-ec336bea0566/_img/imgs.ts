import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("9135ff453072a02c0626da4ed11b65800122b34ed8eaea460c73fc6d73a83a2e", 4000, 2250);
const BgImg = legacyR2ImageSlot("504d8aa3f3edc6ed5616fbfc007d7b42390de8f4257f85ab8c9c776ddbd061f7", 4000, 2250);
const BoardImg = legacyR2ImageSlot("74f9d92423ec1ec78f94542a12dc8921b2ea9cebdff04da1811b069a706a9d2c", 4000, 2250);
const OfflineImg = legacyR2ImageSlot("28cdb6b0f4be1b6e9b56631391d12512b895a2a145d93c310155d19b5a942846", 680, 720);
const OnlineFriImg = legacyR2ImageSlot("391a05e8bd3902d2babde3d9a6e59f79ab2992c8d439dfb041abaf5db7ced800", 680, 720);
const OnlineMonImg = legacyR2ImageSlot("3855944c38ebdadbe300dfc7c408c2d743b11895f6d71b8f418e422e13e65cd6", 680, 720);
const OnlineSatImg = legacyR2ImageSlot("7e9702c471cd9944b8cc22d03d8d84e423d5ed907659174313743796369c8641", 680, 720);
const OnlineSunImg = legacyR2ImageSlot("cfd7c39803d0c33dd2dd66422a6afaa53df06c1bbc98e00f527701b18ceacd65", 680, 720);
const OnlineThuImg = legacyR2ImageSlot("336954aeb6440ee3d1ac41d2b22526603b8126e032cc1bc974843c60b9d2c4e5", 680, 720);
const OnlineTueImg = legacyR2ImageSlot("56d1f26c015ac444a3d3d476fb52e1a3b4dcbf9190d691c31f8d4ff3f4c34322", 680, 720);
const OnlineWedImg = legacyR2ImageSlot("c7e3bb9b0e27ee03f2ef68c5da4e60a49322349b126646b6f5380c00ecf8e7a2", 680, 720);
const TopObjectImg = legacyR2ImageSlot("a1d7d19b60062904ced276dd9c4a591d31bb02c4f61c7ef88b47b50cd8d22ac7", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    bg: BgImg,
    board: BoardImg,
    offline: OfflineImg,
    online_fri: OnlineFriImg,
    online_mon: OnlineMonImg,
    online_sat: OnlineSatImg,
    online_sun: OnlineSunImg,
    online_thu: OnlineThuImg,
    online_tue: OnlineTueImg,
    online_wed: OnlineWedImg,
    top_object: TopObjectImg,
  },
};
