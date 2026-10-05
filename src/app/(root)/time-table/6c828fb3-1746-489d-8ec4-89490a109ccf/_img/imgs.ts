import { legacyR2ImageSlot } from "@/utils/legacy-template-assets/source-policy";
import { ImgsType } from "@/types/time-table/image";

// Background and main images
const artist_az = legacyR2ImageSlot("16c644afb649eb3f98a0e2e6952d487ce7d6c61abc7e9cd47e0806d9a25c2a05", 4000, 2250);
const bg_az = legacyR2ImageSlot("63a9f3758fc13243a1d26603f2abb7f67d68bb9643262dbf3669bedf3c94a931", 4000, 2250);
const profile_az = legacyR2ImageSlot("803f824e7684c2098aa01ec7822dce71099bd4e5a08dbc9ac39978332f6a2bde", 4000, 2250);
const top_object_az = legacyR2ImageSlot("c21f34390d4a92408a58fd3da964006dca2c2fe87f7a9fb72e9ab4892944bfab", 4000, 2250);

// Online images by day
const online_fri_az = legacyR2ImageSlot("89830523dfb1d44cd821402e648adbb015638b364e155ecff3cf0bf88fecfc2f", 1363, 184);
const online_mon_az = legacyR2ImageSlot("228688106d1af4f80f084e3a9b6e6cd13975c0fac91fec4dde0ea77048379c38", 1363, 184);
const online_sat_az = legacyR2ImageSlot("f9fa27505b8274c18edb050e71625bbd99772102e70bef54cd8075e5fe8208af", 1363, 184);
const online_sun_az = legacyR2ImageSlot("22ad3b2c08421914ec9987561153e5caba3cd5cfb5234f17196e3f2fb5cbf954", 1363, 184);
const online_thu_az = legacyR2ImageSlot("710d6639bde465f8adf3e6042a9e24de1796b1b9b58ba8799290cd4bfd1ce0ff", 1363, 184);
const online_tue_az = legacyR2ImageSlot("ea84866e4328af43d656bbb9251597779c23eb63380b01a0a78b3cb73fa1a947", 1363, 184);
const online_wed_az = legacyR2ImageSlot("75061806fe972b10ac606994f2ff9100b7cb6d806d9d10f233669a613f96223e", 1363, 184);

// Offline images by day
const offline_fri_az = legacyR2ImageSlot("1772f2894c67b98c813d85434386ce8a65cf6b94a57fa6d1a4847c443f5ad932", 1363, 184);
const offline_mon_az = legacyR2ImageSlot("a6af37dbdfda1769ec00cf12de2e623db09d2036194cee3729106d8437fae3ae", 1363, 184);
const offline_sat_az = legacyR2ImageSlot("781f6d242a5c663abd731ddaeec519d42d40fe1d120c8d94840f58f8398b34b5", 1363, 184);
const offline_sun_az = legacyR2ImageSlot("63b0b6f00a270e152140550d2e5b5ef5e931d7fd8fea95149be614d430597d76", 1363, 184);
const offline_thu_az = legacyR2ImageSlot("3a86192a5a7718ec4c9451247df0ec53a7dcbdcec59aeeae4cf7022198240bde", 1363, 184);
const offline_tue_az = legacyR2ImageSlot("4d4f153dfbb95f9143a83ac6bbee0ea9d458483e039a424ce065d534a0acb9e0", 1363, 184);
const offline_wed_az = legacyR2ImageSlot("99279465373045c38a453d0bc5f1737f2a076b6b8595c8b984db25b7839431a5", 1363, 184);

export const Imgs: ImgsType = {
  first: {
    artist: artist_az,
    bg: bg_az,
    topObject: top_object_az,
    profile: profile_az,
    online_mon: online_mon_az,
    online_tue: online_tue_az,
    online_wed: online_wed_az,
    online_thu: online_thu_az,
    online_fri: online_fri_az,
    online_sat: online_sat_az,
    online_sun: online_sun_az,
    offline_mon: offline_mon_az,
    offline_tue: offline_tue_az,
    offline_wed: offline_wed_az,
    offline_thu: offline_thu_az,
    offline_fri: offline_fri_az,
    offline_sat: offline_sat_az,
    offline_sun: offline_sun_az,
  },
};
