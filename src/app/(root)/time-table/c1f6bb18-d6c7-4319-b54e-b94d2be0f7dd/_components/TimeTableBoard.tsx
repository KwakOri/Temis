"use client";

import { Imgs as LocalImgs } from '../_img/imgs';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TimeTableBoard = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <div
      className={`absolute flex justify-center z-10`}
      style={{
        width: 1920,
        height: 1080,
      }}
      draggable={false}
    >
      <img
        src={Imgs['first']['bg'].src}
        alt="board"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
    </div>
  );
};

export default TimeTableBoard;
