import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const BoardImg = legacyR2ImageSlot("a96c28ac66a94c5b193d173fa720a7974bf52ac8529827cf9aff5843a4fc0ae5", 4000, 2250);
const DayFri = legacyR2ImageSlot("677b091ade53ba5508139e02b57021e9048610150d64b504f5baa07f15a6d4a1", 260, 120);
const DayMon = legacyR2ImageSlot("69a59b13cfeb37dd158da088f09ec3aa5e3fa0307b28bc3b284a2245d939074e", 260, 120);
const DaySat = legacyR2ImageSlot("774163f1f5b93374dff0520480f680827511023d48a33c226b9df98e5c0833ea", 260, 120);
const DaySun = legacyR2ImageSlot("284c7fbc91e2411eea4f0ea77a54766a1190dfb0bd881e573031d47a57bed3b6", 260, 120);
const DayThu = legacyR2ImageSlot("ba6cd7d53b796b1d9c8a3f7e387ad67dea447243b243ba3e02e9e56d8b6e0892", 260, 120);
const DayTue = legacyR2ImageSlot("35ce851a3091ff772dc689c80b4cd7955ea7f88be816805841ca66b25e3443e3", 260, 120);
const DayWed = legacyR2ImageSlot("97842c757a1d333bf8110e1a799cb01e525485034cb240b87248264c392b7c12", 260, 120);
const OfflineImg = legacyR2ImageSlot("d48581e510c2da1c3af0948d5be7616d2b4c10bf6a93b8e4eee2a7915af57cc1", 780, 700);
const OnlineImg = legacyR2ImageSlot("ac2b119ecdae15152dd9df90f8edd245c422a9b5c88aebf92fa7d1bd0542f15c", 780, 700);
const ProfileImg = legacyR2ImageSlot("1a9e8c519dfe8a31223113f959f4ca16a96fbd57690ebe9bf3b3ea67b8cc7b82", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("189e0491bd0075fdd796a87dc0c87e4243fb75a168cd0cdcc1972fbad731c2e4", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ProfileImg,
    artist_on: ProfileImg,
    artist_off: ProfileImg,
    board: BoardImg,
    top_object: TopObjectImg,
    offline: OfflineImg,
    offline_mon: DayMon,
    offline_tue: DayTue,
    offline_wed: DayWed,
    offline_thu: DayThu,
    offline_fri: DayFri,
    offline_sat: DaySat,
    offline_sun: DaySun,
    online: OnlineImg,
    online_overlay: OnlineImg,
    online_mon: DayMon,
    online_tue: DayTue,
    online_wed: DayWed,
    online_thu: DayThu,
    online_fri: DayFri,
    online_sat: DaySat,
    online_sun: DaySun,
    profile_frame: ProfileImg,
    week_dates: TopObjectImg,
  },
};
