import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";
const MainArtist = legacyR2ImageSlot("fe6c2f32e5909f84fbe03dc3809beeb891b19b0dc86d8a8a4c23cf920e5e88f5", 250, 85);
const MainBG = legacyR2ImageSlot("7a76e07287ed70a9e4adc061d87748c67cb9e9390a1156060d7da497849222d0", 1280, 720);
const MainOffline = legacyR2ImageSlot("f69142601a2668e2d6b6a4ecf436b57ae91d82745f2b3029260a3fc726868aab", 228, 171);
const MainOnline = legacyR2ImageSlot("e144d0ef471592e93450377d83e52aa3bd061df5013ad633798162a50b505688", 246, 171);
const MainOnlineTime = legacyR2ImageSlot("ffd2453f8afaf1f6173faa6d2dff8a99533c9000717c49274fd7ce4c9ae8fc43", 136, 44);
const MainPlaceholder = legacyR2ImageSlot("4bdfe2ecdbcc239c5d44f4e0b46799647d357107d75954dcdf74f9dc5d0db60c", 538, 720);
const MainProfile = legacyR2ImageSlot("43869ed82cd5f3de6a8984b7abdf4c5ac7178d0f1387064507e767d14b028357", 1280, 720);
const MainWeek = legacyR2ImageSlot("f6ce32d5e364d7683bc6658f813e3d1fef6285e01f4740f8b8452f7b9a331347", 244, 387);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    onlineTime: MainOnlineTime,
    placeholder: MainPlaceholder,
    artist: MainArtist,
  },
  second: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    onlineTime: MainOnlineTime,
    placeholder: MainPlaceholder,
    artist: MainArtist,
  },
  third: {
    bg: MainBG,
    offline: MainOffline,
    online: MainOnline,
    week: MainWeek,
    profile: MainProfile,
    onlineTime: MainOnlineTime,
    placeholder: MainPlaceholder,
    artist: MainArtist,
  },
};
