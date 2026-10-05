import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const artist_rabong = legacyR2ImageSlot("f3164f44e2ceb3ee03937da846a927f53c83d78a99f0a9edbff7c2dd6561a564", 4000, 2250);
const bg_rabong = legacyR2ImageSlot("190645db0b8d6b9a931c41ab4b889b112744a2c72f48ca41bf926c6def9075f8", 4000, 2250);
const offline_brown_rabong = legacyR2ImageSlot("4e272b387b02c22297d72406e293956d6432e5e77f26c7fb5f814735c9b890a3", 994, 639);
const offline_orange_rabong = legacyR2ImageSlot("cb95407da635ce9c685cda86fba1f7fcf3d60dbe147c597cf925cf0b00a61b54", 994, 639);
const online_brown_rabong = legacyR2ImageSlot("603790fe8e6249feee3e04796d0ea3fceb3a7265e0b19fe4d9e80cf62fd98061", 903, 449);
const online_orange_rabong = legacyR2ImageSlot("c167186a1d6b35d56e4aa89e29e91618b80b38440517915bf71aadaccda3b56e", 903, 449);
const profile_rabong = legacyR2ImageSlot("54e0c19f4647ec5bfe596dd9f5239e482fdb3d22dd8955487ed5939cd679333d", 4000, 2250);
const top_object_rabong = legacyR2ImageSlot("e8e45e5cf044e625c6e44bf92a47fef45e6a1719441296f432394e5d2a28b999", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: bg_rabong,
    artist: artist_rabong,
    profile: profile_rabong,
    offline_brown: offline_brown_rabong,
    online_brown: online_brown_rabong,
    offline_orange: offline_orange_rabong,
    online_orange: online_orange_rabong,
    topObject: top_object_rabong,
  },
};
