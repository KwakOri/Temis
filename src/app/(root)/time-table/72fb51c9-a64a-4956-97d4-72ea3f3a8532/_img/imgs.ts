import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from '@/types/time-table/image';
const artist = legacyR2ImageSlot("fa8a99fe7deda201c43836a131aac2214dfac02393ce6f5cf32a0841c20e72ff", 4000, 2250);
const bg = legacyR2ImageSlot("99502bc3d7c0389222e0538297e0bd36f472cc324e105229798f9a3c3ab9db2f", 4000, 2250);
const frame = legacyR2ImageSlot("bb747ace5c36661aefa5fd1ac08b27de5c43ba0c20461f6a5adfebbe7567eef9", 4000, 2250);
const memo = legacyR2ImageSlot("6b4d41919e27996cd26ebaed70b94302dc24c52d6f451dd4b5cccc529f78ae59", 2336, 952);
const memo_dummy = legacyR2ImageSlot("2a067bf5282b9cec7f52ec115230b79bcb60db0eaa08bf910964d046c1aab110", 2305, 922);
const multi_a = legacyR2ImageSlot("b0e7074058658ca5bcb623b520a0127ea084da0b1da03cdf8539e532a5205ca1", 838, 284);
const multi_b = legacyR2ImageSlot("4af9c0bf29d6e015f90e0447a8a7b2f97693def52bb90b4c851ca20d1370269c", 838, 284);
const offline = legacyR2ImageSlot("33c66abc37652ff642eaf0d81d58192636e630a1b18312a99ecae8eae3a30f53", 901, 674);
const online_a = legacyR2ImageSlot("7fbece49d662d2fc615a77a5d3f9d6e14ac882834a99fd70814ded03000e7200", 884, 710);
const online_b = legacyR2ImageSlot("211bcdf8e0faaef4475d34202f2d800535c80742db2b7b3e32ccd6940664d03a", 884, 710);
const top_object = legacyR2ImageSlot("d1f2b7d74ae8ac9d460d7f8ba1d5ba5fd08800770307041f87243ec741b07f11", 4000, 2250);

export const Imgs: ImgsType = {
  first: {
    artist,
    bg,
    frame,
    memo_dummy,
    memo,
    multi_a,
    multi_b,
    offline,
    online_a,
    online_b,
    top_object,
  },
};
