import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
const ArtistImg = legacyR2ImageSlot("150758eb7dca9d5244903c3fb07ebe3b1af9f29ffb411b1122b6cd1da19714bc", 4000, 2250);
const MainBG = legacyR2ImageSlot("86a3a7bfa5dbffece577fc9353dee4f513ef7ec06d2bba91f5ed267d7fb6999b", 4000, 2250);
const DaysFri = legacyR2ImageSlot("f0ccba01e09cde0f0003ba60875d006a6ad7f919b43e074583bb6200d5ca47b9", 400, 400);
const DaysMon = legacyR2ImageSlot("a9dfb9bf1e0a05b50d8bd96c0770cff5a6291085820f53bba284c0dadcf03b85", 400, 400);
const DaysSat = legacyR2ImageSlot("8338fe08ff1e2e4b11907ae53eedfa0bf1942441e3672d2fda75bc1c266c8cb4", 400, 400);
const DaysSun = legacyR2ImageSlot("1d823d5755a9945018c442a52971543fe5538a3bd156c7d3bf04aee96aa549c0", 400, 400);
const DaysThu = legacyR2ImageSlot("98704011affa1eb12108bc8ce717966cbfcc69476cd005e6774d3432d177fa60", 400, 400);
const DaysTue = legacyR2ImageSlot("fea09352522d9430262dc7c8928c6ba84a7feec2ccd6a51922568827b43cb3db", 400, 400);
const DaysWed = legacyR2ImageSlot("4adc990f0afd6f8195deda919a59d890896152ee3d4555c22cef6b5811c63264", 400, 400);
const MultiImg = legacyR2ImageSlot("862724051bf17547b2fe4e322089918e25ea6c6fbe76e75f6c52cd2d06423847", 1400, 450);
const OfflineImg = legacyR2ImageSlot("bac5dbabffd3d4374ebb77ebbabf2f75353b1324dcbe1d9c37bd9a895cc97531", 1400, 450);
const OnlineImg = legacyR2ImageSlot("b0cecf9221686745981d2cde6f2cb6059795a551fe0801cf592c223fa7829f5a", 1400, 450);
const ProfileFrame = legacyR2ImageSlot("f2ec1b68da511cd843897f2233500c496ab5d15e31441342d1a8e95503bc0c60", 4000, 2250);
const ProfilePlate = legacyR2ImageSlot("f52bbffef2088c54491f3f55b6fe020e2dd4cb1bdabb8faf1853dfef1ef1b3f2", 4000, 2250);
const TimeImg = legacyR2ImageSlot("c5cc073c2efd46ff4e4ea8a72037dd79a0ed2a3366ba5cd47c663661f2a8a1f9", 300, 120);
const TopObject = legacyR2ImageSlot("5f63e002200ce8e150e4f5c300de40796640cd8296f022ac78a48576f617dddd", 4000, 2250);
const WeekImg = legacyR2ImageSlot("fdc907535abdfaf76899ffb0178faff87d78222666c957845cae372359253143", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    week: WeekImg,
    time: TimeImg,
    days_mon: DaysMon,
    days_tue: DaysTue,
    days_wed: DaysWed,
    days_thu: DaysThu,
    days_fri: DaysFri,
    days_sat: DaysSat,
    days_sun: DaysSun,
    profileFrame: ProfileFrame,
    profileBG: ProfilePlate,
    online: OnlineImg,
    offline: OfflineImg,
    multi: MultiImg,
  },
};
