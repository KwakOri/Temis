"use client";

import { Imgs as LocalImgs } from "../_img/imgs";
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TimeTableOnlineBG = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
        position: "absolute",
        zIndex: 10,
      }}
    >
      <img
        src={Imgs["first"]["online"].src}
        alt={"top-object"}
        draggable={false}
      />
    </div>
  );
};

export default TimeTableOnlineBG;
