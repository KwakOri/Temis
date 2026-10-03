"use client";

import { Imgs as LocalImgs } from '../_img/imgs';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TimeTableTopObject = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        position: 'absolute',
        zIndex: 40,
      }}
    >
      <img
        src={Imgs['first']['top_object'].src}
        alt={'top_object'}
        draggable={false}
      />
    </div>
  );
};

export default TimeTableTopObject;
