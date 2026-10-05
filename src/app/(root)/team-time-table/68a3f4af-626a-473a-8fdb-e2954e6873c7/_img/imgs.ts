import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';

const board = legacyR2ImageSlot("1f08ca7ba33f099cdf054ccca4eb7d869c769df25c9e8ec31ad95c90d51989c5", 4000, 2250);
const liffy = legacyR2ImageSlot("d800a20c95a4b6031ca7303fdc82bb57f8193bd2c10e78d7e1d15990fb2e547c", 380, 244);
const miruru = legacyR2ImageSlot("2aef1a04a7be9353425acaa88bbda8e1c264fb23f8d77527c6c5e5f635ca8add", 380, 244);
const pukong = legacyR2ImageSlot("821f2086126a7ae961a8143d5db62190f9485f91127f66d382565c0e76efca92", 380, 244);
const saac = legacyR2ImageSlot("44c756a100ff2d99648a3a3d7a614c201ce232239c5e8bdd94dad002aa548555", 380, 244);
const week = legacyR2ImageSlot("2a9ca209ddff39601889fe786791522ca56881ee010d7cafaf8cd2477e0e65b4", 4000, 2250);
const weekly_memo = legacyR2ImageSlot("6b88087e372de2de58b333f28b179a6d87491e66f2a7ad251e0faeba7f73607e", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    board,
    weekly_memo,
    week,
    saac,
    miruru,
    pukong,
    liffy,
  },
};
