import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Background and main images
// import ArtistImg from "./main/artist.png";
const MainBG = legacyR2ImageSlot("589bb11db56dd68b13116714a764d0825bc449f22b1b50ed55813872e218d1cb", 4000, 2250);
const TopItem = legacyR2ImageSlot("9f9fdde6ab97429dd9692e20025c42bc27666d576d544a6fcea6e37596ac8471", 210, 210);

// Online images
const OnlineImg = legacyR2ImageSlot("e3fb55cd1d50a901b648d91756e30325e19b71c9306013fc984cad032623ca4c", 2134, 194);

// Offline images
const OfflineImg = legacyR2ImageSlot("4cfea03e03f8f622b819e4a9ed51f3244c88f351ed85280dbc148a824821fb1e", 2134, 194);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("5acb87d9e88aa7910d25558a62f63b200dc5c1e4ebea9a71e2ac4a92547f2379", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    // artist: ArtistImg,
    topItem: TopItem,
    offline: OfflineImg,
    online: OnlineImg,
    profileFrame: MainProfileFrame,
  },
};
