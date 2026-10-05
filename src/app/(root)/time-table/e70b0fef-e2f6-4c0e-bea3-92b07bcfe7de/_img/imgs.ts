import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("d438fdf803f4abb10bd7053fe09af87286f8e6e733a292d6d851ec15458bd7c5", 4000, 2250);
const MainImg = legacyR2ImageSlot("9ef853ab6ac844fa0f0092fba8ac12e1ad2d50edc0a0b4880f8f34f17f194285", 1327, 1484);
const TopObject = legacyR2ImageSlot("255b4d7a78df153df3f566f11ec55fd2a2f779fa4623919e72425f9231a3df04", 4000, 2192);

// Online images
const OnlineFri = legacyR2ImageSlot("d0ed8050c563eb7d06ea6739e5b1a117fc10e154c1bac4555996b0ff4f9a939e", 574, 556);
const OnlineMon = legacyR2ImageSlot("b26ff717e8580152092b665be57a513693bb687dc72bf3cb88b0ff863601ae90", 574, 556);
const OnlineSat = legacyR2ImageSlot("3142b9898cbb6054e95188275c4814cdbb8a9c1f92d73a0797429ef3b49513c5", 574, 556);
const OnlineSun = legacyR2ImageSlot("bd4db9d1dff33aead372d29bd2bc925461eeb554ce6fcfdfe20da6fcb390b54a", 574, 556);
const OnlineThu = legacyR2ImageSlot("84c38210b41266b839ce12b2abada68e41317742d2a5738189e7c02a47064331", 574, 556);
const OnlineTue = legacyR2ImageSlot("b2bb23a407a111199ebb6b88eccd5830f33e90907d356becc35b1947ddd44c6a", 574, 556);
const OnlineWed = legacyR2ImageSlot("068095f4a6cb76ed34a4296310d2599ef82d0ad5273d31874983b71c78783cd7", 574, 556);

// Offline images
const OfflineBrown = legacyR2ImageSlot("210faab482c0825eb5a8d39142ec12b7f0e3c3704102d79d368c81ed5a7de179", 574, 556);
const OfflineGreen = legacyR2ImageSlot("1da10297daef88f4b918c519927403b8a235f5913c86e5eeef234f236254ea17", 574, 556);

// Profile images
const Artist = legacyR2ImageSlot("970239b8da043a18e2e481f66d7eaa3ecc55afec748e523d7a929aee7ec54074", 738, 433);
const MainProfileFrame = legacyR2ImageSlot("4fac6bfc4da5afe1eef14b951468b5ebd95b88af99f15ecbe74d0b81628b7636", 1496, 1707);
const MainProfileBG = legacyR2ImageSlot("41b69483069fab75c4e045131c86572a5bea10489eab28da00bf55ef88705f95", 1327, 1484);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
    topObject: TopObject,

    even: OfflineBrown,
    odd: OfflineGreen,

    mon: OnlineMon,
    tue: OnlineTue,
    wed: OnlineWed,
    thu: OnlineThu,
    fri: OnlineFri,
    sat: OnlineSat,
    sun: OnlineSun,

    profileFrame: MainProfileFrame,
    profileBG: MainProfileBG,
    artist: Artist,
  },
};
