import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

const BoardImg = legacyR2ImageSlot("ef50e1f11727f759cf0402d70030a652c50c5a3a594c6604e29658f2b27cdf3b", 4000, 2250);
const FrameImg = legacyR2ImageSlot("c4167d855a8588993f632a62e5516f6b04764a8c0e3fe998ac0688d450c54fd1", 4000, 2250);
const MultiAImg = legacyR2ImageSlot("f1b7c2ec2f605363c6e4a9e49c389c8c0a785188493f114d550830ed3951edc4", 688, 716);
const MultiBImg = legacyR2ImageSlot("26445bed01f59fe4c5e8bbb672366d130d4b710d5321a34c59d4264922efb1dd", 688, 716);
const MultiCImg = legacyR2ImageSlot("4ad2408c8a8c132b659212d8742bed63a68df63e71c8d2eb9d946fe522779de5", 688, 716);
const MultiDImg = legacyR2ImageSlot("2f7f38e10f3015e6ee73c3a54c8d3ca1f675229fa907b1a4bb42fb3f0848b512", 2112, 432);
const OfflineAImg = legacyR2ImageSlot("38f2c507bff49b68e5861e282142386bbe875f34cf669a37973f9aee4fed84b4", 688, 716);
const OfflineBImg = legacyR2ImageSlot("0ff8aa6b3e5a5572cfa9373c84f6f6de6d3f9ee558a3f4ab08297537322c7f75", 688, 716);
const OfflineCImg = legacyR2ImageSlot("f65517de403eb8f8e34690213d3affd184e6553bd5a3c5622fddf5a249b7f875", 688, 716);
const OfflineDImg = legacyR2ImageSlot("f1bc4201e50ecc73e18d213cda37d10101290c4e2b0249a3c617598e19623a86", 2112, 432);
const OnlineAImg = legacyR2ImageSlot("59edda7d2a44ed36434415dcdc4d1c7a554ff1f4f79700b93769397ac3a87984", 688, 716);
const OnlineBImg = legacyR2ImageSlot("87f237dc3425708c44bf7961de47b2c6433b95a5c40d61c6f4ce2e428ef5c1ad", 688, 716);
const OnlineCImg = legacyR2ImageSlot("9abd54d2508874d2a0fd12d0b4e67a396e0bbae1c9010cd97f0887995bb7ce10", 688, 716);
const OnlineDImg = legacyR2ImageSlot("fedf2a6fe5324cf0aceedae171175c31a0cbf7c57a178a36edd37db3095cba92", 2112, 432);
const TopObjectImg = legacyR2ImageSlot("16b7572411104293ebf94ecb5a42789de2e25aa56ee8057e3a9a5a8bf79d2382", 4000, 2250);
const Plate = legacyR2ImageSlot("c70076adad51abc67e5707242c3164d2203b140d329e2f113b6c8df33ea93164", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    board: BoardImg,
    frame: FrameImg,
    multi_a: MultiAImg,
    multi_b: MultiBImg,
    multi_c: MultiCImg,
    multi_d: MultiDImg,
    offline_a: OfflineAImg,
    offline_b: OfflineBImg,
    offline_c: OfflineCImg,
    offline_d: OfflineDImg,
    online_a: OnlineAImg,
    online_b: OnlineBImg,
    online_c: OnlineCImg,
    online_d: OnlineDImg,
    top_object: TopObjectImg,
    plate: Plate,
  },
};
