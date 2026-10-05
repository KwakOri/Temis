import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

const ArtistImg = legacyR2ImageSlot("0376dc574bbc6d8bf400fc43600a82f763830f072f20c3232341a8cc98be4b3c", 4000, 2250);
const BoardImg = legacyR2ImageSlot("0392a018db070d960a8731712334ca5e9fba4c78d8660650ab3397c605494dc1", 4000, 2250);
const FrameImg = legacyR2ImageSlot("27bf6bab8a9a0756273a2deb785296a79aac7d2cdabd3316692f56815f835c78", 4000, 2250);

const OfflineImg = legacyR2ImageSlot("3d976c38b15d896a57fb0a9233ee26f604800b220ca32e5b4e89104fdace4305", 716, 650);
const OnlineImg = legacyR2ImageSlot("f602324017c3bb40d3eab21875c3c20cc8535eb570b917277720693da4b43118", 716, 650);

const PlateImg = legacyR2ImageSlot("1f86baa43bf695079478fe326aec6d6bf639b639442be15346faa39db83991b0", 4000, 2250);
const TopObjectImg = legacyR2ImageSlot("3ffcd9d31874b63f150b01fdfb8e734e5a2bdfe206f33a787ed261cb2910c5df", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist: ArtistImg,
    frame: FrameImg,
    plate: PlateImg,
    board: BoardImg,
    offline: OfflineImg,
    online: OnlineImg,
    top_object: TopObjectImg,
  },
};
