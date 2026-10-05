import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";
const MainBG = legacyR2ImageSlot("2f25cebd81bd7e74e3181ec6baa1a1feba353367a61b7df2e689221ffa2b6429", 1280, 720);
const MainOffline = legacyR2ImageSlot("7e5cd43e49dabf171f942e8a989382b6374617db0833513be55cee13e3ebf265", 249, 193);
const MainOnline = legacyR2ImageSlot("eae024e2e7ccd2a5cb06bf2b78dafd9b717a5abed3ab4e5e757ac9e8290134bb", 255, 206);
const MainPlaceholderImage = legacyR2ImageSlot("c9a5610ec6e28d7ed6738975e93534780b173195f8f7d73cc90572f4f1daaf2b", 368, 542);
const MainProfile = legacyR2ImageSlot("a59b1cde41f684da154ce1d6b61072cd229a0067a63532e8e6a67fb38641719c", 455, 743);
const MainWeek = legacyR2ImageSlot("9572744198c1d612c707a63b8eb4f99afc0832bc36a3af1604c2707339e2c0bc", 255, 206);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    placeholder: MainPlaceholderImage,
  },
  second: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    placeholder: MainPlaceholderImage,
  },
  third: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    placeholder: MainPlaceholderImage,
  },
};
