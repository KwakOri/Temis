"use client";

import { Imgs as LocalImgs } from '../_img/imgs';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TimeTableBoard = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <div
      className={`absolute flex justify-center z-10`}
      style={{
        width: 4000,
        height: 2250,
      }}
      draggable={false}
    >
      <img
        src={Imgs['first']['board'].src}
        alt="board"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
    </div>
  );
};

export default TimeTableBoard;
