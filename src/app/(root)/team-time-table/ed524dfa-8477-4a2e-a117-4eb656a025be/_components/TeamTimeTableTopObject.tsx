"use client";

import { Imgs as LocalImgs } from '../_img/imgs';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TeamTimeTableTopObject = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <div
      style={{
        width: 4096,
        height: 2304,
        position: 'absolute',
        zIndex: 30,
      }}
    >
      <img
        src={Imgs['first']['top_object'].src}
        alt={'top-object'}
        draggable={false}
      />
    </div>
  );
};

export default TeamTimeTableTopObject;
