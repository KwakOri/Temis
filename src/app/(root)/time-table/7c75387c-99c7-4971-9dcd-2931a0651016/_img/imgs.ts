import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const ArtistImg = legacyR2ImageSlot("2140553175491bd3b3faa8e14d2dea0da6e4dd07ae514331f743c86568bd0483", 4000, 2250);
const BoardImg = legacyR2ImageSlot("d270473e693d84aef43b907cb514b5c3b6dab31aec154fd3cbc2ff09c43fd5f9", 4000, 2250);
const OfflineImg = legacyR2ImageSlot("169d3cf37084b3b390390433f29d0de6b2c6ba6e534d9089157f21d642f9503c", 540, 720);
const OfflineFri = legacyR2ImageSlot("1ecebb913d1a299ec7332176ed3c222037a40ec822874e1fefa49893649176e9", 540, 720);
const OfflineMon = legacyR2ImageSlot("9b8bbfe9d47f5cb27ec37a1502882eec7abbf7b6d11ed33a1277ecb696d0ef03", 540, 720);
const OfflineSat = legacyR2ImageSlot("87d3abe041befa3f4482b3779e241ad7afa05058dd41170ebd36591152c32bef", 540, 720);
const OfflineSun = legacyR2ImageSlot("f60059a134eab8bf16b72e0ed0c6bc8b5ed18768a815433f1d17e2342a0492d1", 540, 720);
const OfflineThu = legacyR2ImageSlot("684bdac9779fad2593cfaff1f1e4844901342e730285ec354261c62238ddfbc2", 540, 720);
const OfflineTue = legacyR2ImageSlot("7bde397e658f65965fce0ae35ac552f32457a876b9f65c31460d315553ee6e65", 540, 720);
const OfflineWed = legacyR2ImageSlot("97d6d8f0d66581b930ad398f54dbc006ec1e305e4f447f6f2cd4abd864e9c526", 540, 720);
const OnlineImg = legacyR2ImageSlot("fc5859db7fc0cdcb40aadd3c4703755edb155d1f07d5a131e90bd90636fd8acf", 540, 720);
const OnlineFri = legacyR2ImageSlot("3e4da23d838275e9c0a05045cdaf62bea1af3b60517626036b3776903f61e618", 540, 720);
const OnlineMon = legacyR2ImageSlot("d4d6629a9c4bb28a0be3888b66a82f9015dd0fcd2389522ce7332cfc1138df48", 540, 720);
const OnlineSat = legacyR2ImageSlot("9d8c6006786e81cf8846302e858fddd497a43beebfa36de611fbca78650d43b8", 540, 720);
const OnlineSun = legacyR2ImageSlot("1d9bb35454eb20247a72c003190ebf631617b488084d432faa54d98efa6b3a13", 540, 720);
const OnlineThu = legacyR2ImageSlot("86f73c829600b52917c3f2047d2fa00a1c7404521bd04a5ea91dbc0785d420c7", 540, 720);
const OnlineTue = legacyR2ImageSlot("01773f4928fbc5198f8f4a73cb60fe7e85afc7a52c10566bce26bdea6f69af3c", 540, 720);
const OnlineWed = legacyR2ImageSlot("eca3193dd1f551e376d1eb265688bbd1d04610f6df6b77d0ff47197ddf8f33a5", 540, 720);
const ProfileImg = legacyR2ImageSlot("e299f36726a3e073d7eb687be5764abd9bb662324c9530978025bc547c666711", 4000, 2250);
const WeekDatesImg = legacyR2ImageSlot("45cc1ef62065cc4c54c95cb15d57b7cc62c555a108e1ec8775acf83971320a30", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    artist_on: ArtistImg,
    artist_off: ArtistImg,
    board: BoardImg,
    top_object: BoardImg,
    offline: OfflineImg,
    offline_mon: OfflineMon,
    offline_tue: OfflineTue,
    offline_wed: OfflineWed,
    offline_thu: OfflineThu,
    offline_fri: OfflineFri,
    offline_sat: OfflineSat,
    offline_sun: OfflineSun,
    online: OnlineImg,
    online_mon: OnlineMon,
    online_tue: OnlineTue,
    online_wed: OnlineWed,
    online_thu: OnlineThu,
    online_fri: OnlineFri,
    online_sat: OnlineSat,
    online_sun: OnlineSun,
    profile_frame: ProfileImg,
    week_dates: WeekDatesImg,
  },
};
