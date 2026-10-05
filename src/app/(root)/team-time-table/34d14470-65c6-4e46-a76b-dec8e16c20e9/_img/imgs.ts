import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const block = legacyR2ImageSlot("4940ebfede146778c225e668b209b0c3438e1eb6f5fd6be845482f4a73d1c96c", 440, 1000);
const board = legacyR2ImageSlot("9268dab4546464707f809b5b365e781169c853b9298b0fcafdb88e47818ceeb6", 4000, 2250);
const offline_bbami = legacyR2ImageSlot("7af76b1f5e88fbe0c06709408bba12817a738cf5c6c12e9f16f6c75002e366df", 408, 248);
const offline_hir = legacyR2ImageSlot("33be1e5c894cf98443c02b1e7140430154c296efdeb3fbec8d7ab64ab8e7f7e7", 408, 248);
const offline_hwabi = legacyR2ImageSlot("b3945de0e0d383d6d00b3f635b47de0e732ee1d247b00b4da831a033654865f4", 408, 248);
const online_bbami = legacyR2ImageSlot("1c45388c2a5b3907ffbaada3f2d56fca0636cd15e10e8b15e184485b6c9a05ee", 408, 248);
const online_hir = legacyR2ImageSlot("d66ad3c43c4d8e0b7a14dfdc9bb4ca45de9e75757565b1ed4ba755f6f08b2643", 408, 248);
const online_hwabi = legacyR2ImageSlot("f5a79837121985cef62689fc023dd162209b9335402ebb0dfe30aa400fe5c29e", 408, 248);

export const Imgs: ImgsType = {
  first: {
    block,
    board,
    offline_bbami,
    offline_hir,
    offline_hwabi,
    online_bbami,
    online_hir,
    online_hwabi,
  },
};
