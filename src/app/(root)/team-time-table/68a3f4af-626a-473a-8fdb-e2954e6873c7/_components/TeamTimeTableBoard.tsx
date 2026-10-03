"use client";

import { Imgs as LocalImgs } from '../_img/imgs';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TeamTimeTableBoard = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
        position: 'absolute',
        zIndex: 10,
      }}
    >
      <img src={Imgs['first']['board'].src} alt={'board'} draggable={false} />
    </div>
  );
};

export default TeamTimeTableBoard;
