"use client";

import { Imgs as LocalImgs } from '../_img/imgs';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TimeTableFrameTop = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
        position: 'absolute',
        zIndex: 30,
      }}
    >
      <img
        src={Imgs['first']['frameTop'].src}
        alt={'frame-top'}
        draggable={false}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default TimeTableFrameTop;
