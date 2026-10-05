import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Main images
const MainArtist = legacyR2ImageSlot("e122caa4f989a6f9f47ad5f006d0469ea1a253ce8793e2f970be947b60f3b90e", 1429, 482);
const MainOffline = legacyR2ImageSlot("9ebc4190942140003b909a509dbe5eb5c72aecb45c59b2bfaf8416f2411aebd3", 718, 551);
const MainOnline = legacyR2ImageSlot("f6b0b55f594a9f1418259680dbf427ecb42c866572ae745eb792c7b3d90688fa", 806, 477);
const MainProfileBG = legacyR2ImageSlot("1602cc8d6a1ffc2617824981fc6ec9e6920609d24a4321469af71d6521de096f", 1417, 1954);
const MainProfile = legacyR2ImageSlot("4ab7005398da0959c8a6a093abe4d5376a1016e21f4b92e3dec5f1a7b8cc4396", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    profileBG: MainProfileBG,
    offline: MainOffline,
    online: MainOnline,
    profile: MainProfile,
    artist: MainArtist,
  },
};
