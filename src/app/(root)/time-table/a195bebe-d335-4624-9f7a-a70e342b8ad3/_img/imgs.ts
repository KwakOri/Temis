import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const Artist = legacyR2ImageSlot("74ac708469e3bbb5859b9e6f706886171306b73dabc90b23eebb3a2976867a2c", 4000, 2250);
const MainBG = legacyR2ImageSlot("83c878fce20b79a97745d72b9e8b55df80de1c0b281dd7777378ecf89b15b3cb", 4000, 2250);

// Online/Offline images
const MemoImg = legacyR2ImageSlot("9705fb9c4cafdda7c5b2edeee82ce341afee6c7db3592c19fc7ece97ade5dfc6", 800, 617);
const OfflineImg = legacyR2ImageSlot("2633aa31341f65e3bb6c2a9c94e529ea5163ac56382f8ec2183c817c4a9ecf63", 800, 617);
const OnlineImg = legacyR2ImageSlot("83efd5cc055496561212891c9a1087d048ba6a25766c681d38e68ff9fd839a89", 800, 617);
const Online2Img = legacyR2ImageSlot("32fb7469e4d918ceb761c431643f96c8187b1101e72b1016393e5bb7e1cdfea1", 800, 617);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("bbb68c8bd8603d6cc8c871d33296675369404a5ec381f211b496833649a1b91a", 4000, 2250);
const TopObject = legacyR2ImageSlot("1c0c29a5f215bd09400f6e75f31034ebe3f7c0c82fdbb07066a8223123a593b8", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: Artist,
    offline: OfflineImg,
    online: OnlineImg,
    bigOnline: Online2Img,
    memo: MemoImg,
    profileFrame: MainProfileFrame,
    topObject: TopObject,
  },
};
