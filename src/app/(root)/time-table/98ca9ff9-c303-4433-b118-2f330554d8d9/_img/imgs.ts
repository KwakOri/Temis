import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

// Main object
const TopObject = legacyR2ImageSlot("09087f1e767fba4cc84aa174a9de6fea9c351e5dc951d9b2a80167646f1b526c", 3840, 2160);

// Online images (per day)
const OnlineFri = legacyR2ImageSlot("94fd1ff6d91944be079007b9f5b3e76d1d040e39d33fad3e9e3172350274a6dc", 1540, 240);
const OnlineMon = legacyR2ImageSlot("a47b0830dcd3e375323065938d6d73471f54ee282e12d270ce1980aeb352ef25", 1540, 240);
const OnlineSat = legacyR2ImageSlot("969e10b96d9eda51a050fbd10a6807544a42ab4da1a7625325366ddbec1fb4e9", 1540, 240);
const OnlineSun = legacyR2ImageSlot("4a0af3285a7c54359410ba66b1a8e228c6aa78ec972cf02cbd2d65353d5dadc1", 1540, 240);
const OnlineThu = legacyR2ImageSlot("d12e7af85c221a79a74bfc17945451e84029edf4522683ccac24a9965ad2a089", 1540, 240);
const OnlineTue = legacyR2ImageSlot("41e04270327ce50fd072f5a20349a27ddafe9c39831da7067022147801f3f4ee", 1540, 240);
const OnlineWed = legacyR2ImageSlot("fb6559169c8044c2b283dc5de97ccc53953e490b9800a10b72d03af040869c25", 1540, 240);

// Offline images (per day)
const OfflineFri = legacyR2ImageSlot("e7b4f680b1e30b6c2ed2b041fd5ea89d5d959bc0f872f4c23a24f2b088cf9966", 1540, 240);
const OfflineMon = legacyR2ImageSlot("2a6cf66b192e9947419b2aa4b420ae27ccc1b296a8b4747ee5a096652c29effb", 1540, 240);
const OfflineSat = legacyR2ImageSlot("3a80dab548223e748c9f23e4938ac30190a05fd398394ad450f84c53d9b46547", 1540, 240);
const OfflineSun = legacyR2ImageSlot("2558e1f0ad8f842591c261a04ea5a860c57e197e7fc1e742d32ddb790afc58f2", 1540, 240);
const OfflineThu = legacyR2ImageSlot("cd7ad1aa1c5b4b4c9bb0607647db4b49bb9046bb49f3ac2e229733a6e11b9e89", 1540, 240);
const OfflineTue = legacyR2ImageSlot("bb3f03392386cd880c979e98326cfe821a85c232f09dca8ebe3f6cfab4d9c2d3", 1540, 240);
const OfflineWed = legacyR2ImageSlot("dfec35453021dc18d1ea996662baa24d0d1beecc5bfaadf69cd821a675e9adf1", 1540, 240);

// Profile images
const MainProfileFrame = legacyR2ImageSlot("3861240df4d44b6218f71eed716ac541c98db0a21c8603de689e69f8031858db", 3840, 2160);

const OnlineAcc = legacyR2ImageSlot("0bbdb9adb262afabf1795e6c82dae4838a2b435302f8ea40ee81bc2fe38dff2d", 140, 140);

const MainBG = legacyR2ImageSlot("60a7cf6e320daeff44fc7ed76bf5e5aad78d92730fcc8475bfa723f7bb60f607", 3840, 2160);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    topObject: TopObject,
    profileFrame: MainProfileFrame,
    online_mon: OnlineMon,
    online_tue: OnlineTue,
    online_wed: OnlineWed,
    online_thu: OnlineThu,
    online_fri: OnlineFri,
    online_sat: OnlineSat,
    online_sun: OnlineSun,
    offline_mon: OfflineMon,
    offline_tue: OfflineTue,
    offline_wed: OfflineWed,
    offline_thu: OfflineThu,
    offline_fri: OfflineFri,
    offline_sat: OfflineSat,
    offline_sun: OfflineSun,
    online_acc: OnlineAcc,
  },
};
