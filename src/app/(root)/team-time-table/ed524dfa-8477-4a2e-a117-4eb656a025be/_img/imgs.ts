import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const BoardImg = legacyR2ImageSlot("3b640ebdad160b43579f3ae2283f77e87653328de570974aef9555e1c4f97290", 7998, 4500);
const ChunghaOfflineImg = legacyR2ImageSlot("e91a4c7bb2e387787c7ea27373148878c364843422a78c69cc47a6114b57748c", 350, 430);
const ChunghaOnlineImg = legacyR2ImageSlot("2592dcdd115fe917f394339077ef623b2af02e84c7e600416448c5e82165edc8", 350, 430);
const DongdongOfflineImg = legacyR2ImageSlot("d62927d485ed50b6bc8f2ad8fed21373dbb7b8171ec43e8e676f2bee71cc7486", 350, 430);
const DongdongOnlineImg = legacyR2ImageSlot("db5c0e6be129e65dddb3215bee588b451ec3ceac012240855b3fae88c73f1a72", 350, 430);
const OnlineFriImg = legacyR2ImageSlot("3405ba71310911454fe3b6fb6d3045ce334436f7886a92df1c7a0161d7e6268d", 820, 680);
const OnlineMonImg = legacyR2ImageSlot("b4f6c72d9656dba3cd872ea471493ab8d80fb309f377738a0e4f0ccf7749b5ad", 820, 680);
const OnlineSatImg = legacyR2ImageSlot("9b112cd6c290701a752ac5871d0e8547b921290c695f900621155435889479b3", 820, 680);
const OnlineSunImg = legacyR2ImageSlot("312c799e19bd5d60754b0cbe23cecabe248b8c11c4588cbcb4412aefe3b070d5", 820, 680);
const OnlineThuImg = legacyR2ImageSlot("05e8b0a935a0ace5f10d5231c0c4c3ac43f40e6aebaf3f1739dd8a208ed8226d", 820, 680);
const OnlineTueImg = legacyR2ImageSlot("a7a4b6aaa66c63cfc5fdd627681789d46034f7814b7186a2ec33ba0d6aba82fa", 820, 680);
const OnlineWedImg = legacyR2ImageSlot("bd56dd70755725df8d65dfd6d7cab11e554bb444ed213b40c668f5206293c4bf", 820, 680);
const TopObjectImg = legacyR2ImageSlot("a17aacb782b14b51bcf8cd286f4e680cd93c1b2b508df7559d8413efe18d3320", 7998, 4500);

export const Imgs: ImgsType = {
  first: {
    board: BoardImg,
    chungha_offline: ChunghaOfflineImg,
    chungha_online: ChunghaOnlineImg,
    dongdong_offline: DongdongOfflineImg,
    dongdong_online: DongdongOnlineImg,
    online_fri: OnlineFriImg,
    online_mon: OnlineMonImg,
    online_sat: OnlineSatImg,
    online_sun: OnlineSunImg,
    online_thu: OnlineThuImg,
    online_tue: OnlineTueImg,
    online_wed: OnlineWedImg,
    top_object: TopObjectImg,
  },
};
