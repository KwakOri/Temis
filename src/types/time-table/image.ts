import { StaticImageData } from "next/image";

export type ImgTypes = {
  [key: string]: StaticImageData;
};

export type ImgsType = Record<string, ImgTypes>;
