import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const MainBG = legacyR2ImageSlot("80a1772736e70afef2f034b3e1d374d0fc94a0844d18af9c1656d530f9840e38", 4000, 2250);
const MainImg = legacyR2ImageSlot("564dd26281b1150d36da8d270d61bb0e48732401ce496f14de96d65e2d1da2d0", 4842, 2759);
const TopObject = legacyR2ImageSlot("d1318c00c3833959c60524201c4c519e89954331ff97ff152fdfc4011a308b53", 4000, 2250);

// Online images
const OnlineFri = legacyR2ImageSlot("dd662dde38af90b75be3c88d791b904d815ad34eb03c43a0c04b837f8ee45930", 746, 600);
const OnlineMon = legacyR2ImageSlot("dff9817bfc591711a1eba50197ab0c936cc03155e9de790dcd8786bc6a994a34", 746, 600);
const OnlineSat = legacyR2ImageSlot("a8590f72e654736e1492aea065e73e7daf3179a750f407f6a79074e3ebfb4276", 746, 600);
const OnlineSun = legacyR2ImageSlot("0f4496abb9cb13e39716d2a445f9e62a9224198d46cea58025e4d99d45eb4fc5", 746, 600);
const OnlineThu = legacyR2ImageSlot("d1bbca4d510b0f1b7104ec97f4610a20e682092a03bcdcc0899ae0133b9121d5", 746, 600);
const OnlineTue = legacyR2ImageSlot("adb6b4533374f727f6c59ec57ef2fa588c88a1ee11137849c02c15c0bf24d8fc", 746, 600);
const OnlineWed = legacyR2ImageSlot("944d179bd9659c94cd861da9ccf9146066d641e44ad525245c873465e4f68f42", 746, 600);

// Offline images
const OfflineImg = legacyR2ImageSlot("4af2313615e6cf253be6269001b5e1e02d9fd3fa6a9a89dc635d3c7d1a39c6ca", 746, 600);

// Profile images

const MainProfileFrame = legacyR2ImageSlot("fac729a683b6ea5d89383c009ddebc900927b19c0bc4e27c24a910c2285725f6", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    bg: MainBG,
    img: MainImg,
    topObject: TopObject,

    offline: OfflineImg,

    mon: OnlineMon,
    tue: OnlineTue,
    wed: OnlineWed,
    thu: OnlineThu,
    fri: OnlineFri,
    sat: OnlineSat,
    sun: OnlineSun,

    profileFrame: MainProfileFrame,
    profileBG: MainBG,
  },
};
