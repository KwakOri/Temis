import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("200200178d0cfd3323acafb888eab394809b6d34daeb69ad7247d5aedbdfc88b", 4000, 2250);
const BoardImg = legacyR2ImageSlot("dfa4bbca0632195925353ecfd9a759b6121684e1870d79fdbbd38fb650e63515", 4000, 2250);
const OfflineFriImg = legacyR2ImageSlot("24fe1850fe28d1e39ede3e8206a4e3562a5a703ceefa8765433fc9ec889306af", 4000, 2250);
const OfflineMonImg = legacyR2ImageSlot("8db1a3afbb8e77fac216c74a6652fa72fab8b27ba95698bbf3fce6d3c9b0c75a", 4000, 2250);
const OfflineSatImg = legacyR2ImageSlot("1e8fb5da32cb2be0dfc29d05c9fabc46e93cbaa13a76ae7b09443376b144b6df", 4000, 2250);
const OfflineSunImg = legacyR2ImageSlot("79e0502b5653a0432ff7f88b2aaae1f997c4a51690516e951bf625b36427d459", 4000, 2250);
const OfflineThuImg = legacyR2ImageSlot("cf4a2739ba5d9f9748574c25ba340cf1e4f78e4ae720d30b9c11a39a256dc62c", 4000, 2250);
const OfflineTueImg = legacyR2ImageSlot("58bf8e8bdb8c6ab4d9db02b33989a8f2cf9395af5350cc30eb0604e15a6f2262", 4000, 2250);
const OfflineWedImg = legacyR2ImageSlot("951242d4a5c5605dd4a1af55fbb21ff92a092fe9b57823827e8f24f0fa5f55c0", 4000, 2250);
const OnlineFriImg = legacyR2ImageSlot("b2e9ced57eca78fe2291ee5faa293dee34450200ecf83d6a3baea44899ce0f20", 4000, 2250);
const OnlineMonImg = legacyR2ImageSlot("304c744b1016c51df1334cfb870d13079763420c8f9614f43b4e8555583cc4b4", 4000, 2250);
const OnlineSatImg = legacyR2ImageSlot("3002cfe06418d49148b24dd6d0620d7a6f91f9da7c417063164654601c61a20d", 4000, 2250);
const OnlineSunImg = legacyR2ImageSlot("1c2b3078303f79e4aeed6564dfbdba4887070f15018c5f4d092d5b44c1c94236", 4000, 2250);
const OnlineThuImg = legacyR2ImageSlot("6849a2ba56ff1e7f8080d695efd3d909a0e07fe7b20c89e09b88e6ee66f3ef69", 4000, 2250);
const OnlineTueImg = legacyR2ImageSlot("dcbdb1cabf4acf42ed983593209da5a83c10e15500323c6d0d08de0dce3544c6", 4000, 2250);
const OnlineWedImg = legacyR2ImageSlot("0503cb1cd01f319ba127c46f4787a731ac789a4144660fb7c09de7c714188fb2", 4000, 2250);
const ProfileImg = legacyR2ImageSlot("5891e4b03912100879eac472500a93a9811fa4d19a5e333f325ae81341322298", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("f5339cfe8001fbd5f8ee7425384ae1c78093bc02229e3bb1eb125d64b6d461c8", 4000, 2250);
const WeekDatesImg = legacyR2ImageSlot("a66afc80309464cc078ed762eea214f8365e48f45acfdf4a683fbbe8d8f3db56", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    board: BoardImg,
    top_object: TopObjectImg,
    week_dates: WeekDatesImg,
    profile_frame: ProfileImg,
    artist_on: ArtistImg,
    artist_off: ArtistImg,

    offline_fri: OfflineFriImg,
    offline_mon: OfflineMonImg,
    offline_sat: OfflineSatImg,
    offline_sun: OfflineSunImg,
    offline_thu: OfflineThuImg,
    offline_tue: OfflineTueImg,
    offline_wed: OfflineWedImg,

    online_fri: OnlineFriImg,
    online_mon: OnlineMonImg,
    online_sat: OnlineSatImg,
    online_sun: OnlineSunImg,
    online_thu: OnlineThuImg,
    online_tue: OnlineTueImg,
    online_wed: OnlineWedImg,
  },
};
