import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const Artist = legacyR2ImageSlot("eb5e7a2d54da3edd7998ded915b3b33337c15a13db8e3f3a985959e497b50f4e", 4096, 2304);
const FrameImg = legacyR2ImageSlot("428747415efd530aab6531c3dd26a460458e0c3bc22f96dc5e84d90f0b8ac65f", 8000, 4500);
const OfflineFriImg = legacyR2ImageSlot("e3cf6a1ad00d087557c2ad91412716ebed9d149206bfbb75990b69f540965141", 8000, 4500);
const OfflineMonImg = legacyR2ImageSlot("581d37b5834905d4e8676193badf9bb2eba67b60b3be8cc2b02e0919a3a4873e", 8000, 4500);
const OfflineSatImg = legacyR2ImageSlot("65bdae44251084c24636ca3ce9dca13c8a2ee23d44a53487768bdc72a9e46668", 8000, 4500);
const OfflineSunImg = legacyR2ImageSlot("951cec35205d774a76a456fb7508df9e89362007b40c095a4142bd0dcd14ce8c", 8000, 4500);
const OfflineThuImg = legacyR2ImageSlot("f7ee0a273e89949cab6abccec1a38880d0c3d447edf2143ad9cb4e3ff065bb85", 8000, 4500);
const OfflineTueImg = legacyR2ImageSlot("fdf59b890fbdb7a149a02640cc72e37114fa298761cf84f7150506f0f7f8892c", 8000, 4500);
const OfflineWedImg = legacyR2ImageSlot("3ee2c8a73c794fe25fa2134f14a4927421006e3475641dad2765a0371b11f63e", 8000, 4500);
const OnlineFriImg = legacyR2ImageSlot("6959b3ce50c3f1610a67e910ff092b1e360ef77067b74b2914b5314f607784e1", 8000, 4500);
const OnlineMonImg = legacyR2ImageSlot("15691afcb41d8eb0dfceebc5121a3642edc001b8aeb77ecfd19fb6022d10294f", 8000, 4500);
const OnlineSatImg = legacyR2ImageSlot("991bf84a7120f1cc66dddafbac85e43e7a202dddc786c0b1a366e8b6810f6662", 8000, 4500);
const OnlineSunImg = legacyR2ImageSlot("f016e94aed3abdef3de12f789d285617d7c20ea1ad30980a0faff9d81fbe3f7e", 8000, 4500);
const OnlineThuImg = legacyR2ImageSlot("94f3bdef4e72f46087edb764b62826dbb66a2b16e7a48b12459339a68350094b", 8000, 4500);
const OnlineTueImg = legacyR2ImageSlot("9408aa6ba66c3f236b44bc00edc357377ddf8daf1a3b0e53659a7327cf0c39c1", 8000, 4500);
const OnlineWedImg = legacyR2ImageSlot("21cf47e31164f4a7e0f2b83e3e1649af61aceca1534ad71cb0326bfc02287510", 8000, 4500);
const TopObjectImg = legacyR2ImageSlot("36be0f5c39788109b1394c1707903b9359271865b6d6b97e6545dd6c690ee022", 4096, 2304);

export const Imgs: ImgsType = {
  first: {
    frame: FrameImg,
    offline_fri: OfflineFriImg,
    offline_mon: OfflineMonImg,
    offline_sat: OfflineSatImg,
    offline_sun: OfflineSunImg,
    offline_thu: OfflineThuImg,
    offline_tue: OfflineTueImg,
    offline_wed: OfflineWedImg,
    online_fri: OnlineFriImg,
    online_mon: OnlineMonImg,
    online_sat: OnlineSatImg,
    online_sun: OnlineSunImg,
    online_thu: OnlineThuImg,
    online_tue: OnlineTueImg,
    online_wed: OnlineWedImg,
    top_object: TopObjectImg,
    artist: Artist,
  },
};
