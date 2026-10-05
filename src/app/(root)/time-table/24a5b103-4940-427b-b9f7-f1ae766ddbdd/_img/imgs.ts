import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const ArtistImg = legacyR2ImageSlot("8d67eaff9570edd477add30574588ce02a2c4da907e4668371dc0836898a50ef", 4000, 2250);
const MainBG = legacyR2ImageSlot("e11ae512df852a78de125e9df2ac47325fabdb8bd1b50963f757cda2e2abefb2", 4000, 2250);
const TopObject = legacyR2ImageSlot("3cc944580d1b18e0d65ab94c62bb974059fd03ec4dff971b870a632a77a4cabb", 4000, 2250);

// Online images
const OnlineImgA = legacyR2ImageSlot("217ae9728360a9eb71a9f55c07f2bbd7a459ec3c208e33e45eb50796f88b93cf", 1156, 755);
const OnlineImgB = legacyR2ImageSlot("3b0d6642459e0847a272df8853076ebf65854903740c16c8f820666e6f995326", 914, 648);
const OnlineImgC = legacyR2ImageSlot("86b3073b7ac448b9fc6b802eda17872b408aac0c1d239b22bc4204d42c7ad28b", 784, 549);
const OnlineImgD = legacyR2ImageSlot("dbac53c345c6d14b2faabe97d60e25889f83c84bbfacaf2be3d56bbe1869d25f", 849, 449);

// Offline images
const OfflineImgA = legacyR2ImageSlot("49231896aced91c684a8a85c21cc29235d70a18062ec596a98c2518afb733cb7", 1156, 755);
const OfflineImgB = legacyR2ImageSlot("9a7ecf8e6b44c7d3a68a884479b3e30ea767dce4046155b29b65d6d948da6893", 914, 648);


// Profile images
const MainProfileFrame = legacyR2ImageSlot("ca43cd86daa7d5cc35f8932e5792865f5cf204205c62b76c6a76d71efe862f0e", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    artist: ArtistImg,
    topObject: TopObject,
    offlineA: OfflineImgA,
    offlineB: OfflineImgB,
    onlineA: OnlineImgA,
    onlineB: OnlineImgB,
    onlineC: OnlineImgC,
    onlineD: OnlineImgD,
    profileFrame: MainProfileFrame,
  },
};
