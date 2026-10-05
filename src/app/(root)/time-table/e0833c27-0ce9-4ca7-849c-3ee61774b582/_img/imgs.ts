import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("157f496df8ca26965d28425771fe3264d0a81d10b667359552e1304c10b23e2d", 452, 139);
const MainBG = legacyR2ImageSlot("5f8eb2784a817dcaf161fcbad75c82652820003a3b81d97f98ffd6c5e417c6ab", 4000, 2250);
const MainImg = legacyR2ImageSlot("ae98baf542bf8d75c23f4d3a9326bf21e481a2796fd6838d9b002baa689a07cc", 3665, 2208);
const TopObject = legacyR2ImageSlot("ff8fe78777e216cd4ef0f81ce89b4360b6f407d176ebb9a353783aa1407e95d3", 4000, 2250);

// Online images
const OnlineFri = legacyR2ImageSlot("337ec0f4d3229994514520f8a1e755863d3fe123df2e49e44526ee4162ccd09a", 846, 651);
const OnlineMon = legacyR2ImageSlot("17d51cebfb049fa33eeff4e82ee824b59ba63e000aeded4d4a938d1916fc2a87", 846, 651);
const OnlineSat = legacyR2ImageSlot("303061bf5464e35ddf042ee47f324a853d9d4c14d5b8d35e1e6896c2686df568", 846, 651);
const OnlineSun = legacyR2ImageSlot("d2c43f27b55dfca26d209de6db2c66c7177c1b916d4f981a85116cdceb530f0e", 846, 651);
const OnlineThu = legacyR2ImageSlot("3f533227e99dfff8051393d2b5165fd5279a2d21cb49ff8b4220d16765b387da", 846, 651);
const OnlineTue = legacyR2ImageSlot("73ec5177da16b7a3a5a8b9bd5d1f82cc254e5368814fcc24f822213b6e17b4ab", 846, 651);
const OnlineWed = legacyR2ImageSlot("6f03546e0d216d74a93faa4debdc7ee7a63951a3b123dedd17108371fd79e360", 846, 651);

// Offline images
const OfflineImg = legacyR2ImageSlot("134ef4ba2c1e723718e51acaddb972760fe948fc03df084ea4c80d4860fc5fb3", 846, 651);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("1a437a3c61de56ab7f8a203c7dd9431de7d4950caf364b8d06d610faf8f5d442", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
    artist: ArtistImg,
    topObject: TopObject,

    offline: OfflineImg,

    mon: OnlineMon,
    tue: OnlineTue,
    wed: OnlineWed,
    thu: OnlineThu,
    fri: OnlineFri,
    sat: OnlineSat,
    sun: OnlineSun,

    profileFrame: MainProfileFrame,
    profileBG: MainBG,
  },
};
