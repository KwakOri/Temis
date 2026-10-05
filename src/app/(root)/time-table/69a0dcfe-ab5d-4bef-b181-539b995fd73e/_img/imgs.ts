import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const Artist = legacyR2ImageSlot("893234c838ae2cea591cda73a91e9cdc2268230c454a00ff62a838298ff964ff", 809, 350);
const MainBG = legacyR2ImageSlot("0c394a19ffbf43918399caf6783747fa6cb56b1b9cc90e876db80be2ae306486", 4000, 2250);
const Schedule = legacyR2ImageSlot("edb58da2253990c0fe6faa6d5eb6682642b5368067e8d9f3a64563ef8208503b", 2671, 2203);

// Online/Offline images - Orange variant
const OfflineOrange = legacyR2ImageSlot("8c51095dc7553c4e24ff33130badd05523ac0d83ddb9eeeb82f2f74ac5534717", 1187, 372);
const OnlineOrange = legacyR2ImageSlot("64dc9ee37dce8791f3576215f9f1f91e12fac72168efee9c1c9571fac0b469eb", 1187, 372);
const BigOfflineOrange = legacyR2ImageSlot("726f35493111ef4a8ccd1e9756f2c550874f787ab7e99e15a71bfdce19b10676", 1222, 801);
const BigOnlineOrange = legacyR2ImageSlot("2063097d284a5077bfce112de9748a5266c0dd8519133545d46c095930dcbeec", 1222, 801);

// Online/Offline images - Yellow variant
const OfflineYellow = legacyR2ImageSlot("aafe138c980c3482057ee7665523166cdabace701aefbbb799a205cf9aa44b92", 1187, 372);
const OnlineYellow = legacyR2ImageSlot("131c2ec47562a842ade33b7a271567460a19aa4526e84554f7d7aad1033abba5", 1187, 372);
const BigOfflineYellow = legacyR2ImageSlot("9b6164e1687053d3f3b0cbc89574eb8f0a425f79e45bfecac9b5490a9f77925f", 1222, 801);
const BigOnlineYellow = legacyR2ImageSlot("7c9859a08e681134b0d09d42733da784810c6f3fa82c06f8b52c30787875af37", 1222, 801);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("bfb88e5e8c80a56cf416f82cc4d8df8009d642ec1143a3345238df0f31527d9d", 4000, 2250);
const TopObject = legacyR2ImageSlot("75d78a5d94de851c6449d193d9a20c4b1bdd94ba71a80645fa0ed207813ac232", 2624, 2157);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineOrange,
    online: OnlineOrange,
    profileFrame: MainProfileFrame,
    profileBG: MainBG,
    topObject: TopObject,
    schedule: Schedule,
    bigOffline: BigOfflineOrange,
    bigOnline: BigOnlineOrange,
    offlineYellow: OfflineYellow,
    onlineYellow: OnlineYellow,
    bigOfflineYellow: BigOfflineYellow,
    bigOnlineYellow: BigOnlineYellow,
  },
};
