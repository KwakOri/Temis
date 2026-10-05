import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ThreeDioImg = legacyR2ImageSlot("a3218ca3176ef91eee91a7f2dacea42219e8081ba038444712caff54dd06eb48", 270, 148);
const MainBG = legacyR2ImageSlot("5ac1c56d6a4dd7ac08d610c8fdd3ac7659b6adf0799890c68dd404e723db7c13", 1280, 720);
const YetiImg = legacyR2ImageSlot("034ddfaba21ffc5cda7dde0691e4cd81a7680207692f1618eed8c75354f9c31d", 270, 148);

export const Imgs: ImgsType = {
  first: {
    frame: MainBG,
    threeDio: ThreeDioImg,
    yeti: YetiImg,
  },
};
