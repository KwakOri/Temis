import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";
const BlueBG = legacyR2ImageSlot("033f414a5a755d5065b3b1e8709b78a9683142442f0d8fad8af718666930fac2", 1280, 720);
const BlueOffline = legacyR2ImageSlot("9dd3f88dc9f37c4575c1dd67fe57f705db701cbcbae52398bb7ce00d33c8ce58", 188, 228);
const BlueOnline = legacyR2ImageSlot("901246fb47250290ebb549ae0e93179b7bc077e01829c064e511a877ed386fbd", 188, 228);
const BlueProfile = legacyR2ImageSlot("fe0f9b58168726774457d51e58c4a96843d6df7885b63c2fb8901b9df25fef9a", 515, 720);
const BlueWeek = legacyR2ImageSlot("90d2b44ea6557c312aac263351e7ad19daaabc99c92d27e4a56730437ffec517", 132, 168);
const PinkBG = legacyR2ImageSlot("eb3d6c64dc2d7aa93f7b475872a92b9bd164f5be35fd6e7639df7747ab94c95d", 1280, 720);
const PinkOffline = legacyR2ImageSlot("3a6a84a0480e921bedf27b1e8be8fe4d7482a8e76a1b09a7b9ce85aaebeb7221", 188, 228);
const PinkOnline = legacyR2ImageSlot("f96dce02606134ca4f031e4e128273975d4e3f0ac0d97226f3efd3e5fc335083", 188, 228);
const PinkProfile = legacyR2ImageSlot("e1effb2828b992c65741c94b92d57ca45935fbc438d60c2c954308b61d925d84", 515, 720);
const PinkWeek = legacyR2ImageSlot("6fd412ec39fef3893c43f7b1fca7df0b3b7888b0e58e3a1fe031afdaddbfd293", 132, 168);
const YellowBG = legacyR2ImageSlot("39d698b749bec191afc2d53c375ede45978bc82546e653c40be23ddee97fa11a", 1280, 720);
const YellowOffline = legacyR2ImageSlot("972860c89097504f406548dbadf467813654e6fb724ba9ac4afb980bace59751", 188, 228);
const YellowOnline = legacyR2ImageSlot("df28513f0fbbcf2816943c1cc45189698185a19ca4cdb50160887a005652beb6", 188, 228);
const YellowProfile = legacyR2ImageSlot("33167d1ac302ab89f8cbae69d87db5c77542c9368e8866b3c60bc8c2f586ec32", 515, 720);
const YellowWeek = legacyR2ImageSlot("5600da59bbc5257a07f0da4fa78b8b64e1ba641f8a3152d07c1219a288655053", 132, 168);

export const Imgs: ImgsType = {
  first: {
    bg: BlueBG,
    offline: BlueOffline,
    online: BlueOnline,
    week: BlueWeek,
    profile: BlueProfile,
  },
  second: {
    bg: YellowBG,
    offline: YellowOffline,
    online: YellowOnline,
    week: YellowWeek,
    profile: YellowProfile,
  },
  third: {
    bg: PinkBG,
    offline: PinkOffline,
    online: PinkOnline,
    week: PinkWeek,
    profile: PinkProfile,
  },
};
