"use client";

import { Imgs as LocalImgs } from '../_img/imgs';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TimeTableBoard = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <>
      <img
        style={{
          zIndex: 12,
        }}
        src={Imgs['first']['board_frame'].src}
        alt="board"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
      <img
        style={{
          mixBlendMode: 'multiply',
          zIndex: 11,
        }}
        src={Imgs['first']['board_blend'].src}
        alt="board"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
    </>
  );
};

export default TimeTableBoard;
