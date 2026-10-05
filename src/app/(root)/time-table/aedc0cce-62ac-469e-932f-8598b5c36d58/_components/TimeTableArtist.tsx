"use client";

import { AutoResizeText } from "@/components/AutoResizeTextCard";
import { Imgs as LocalImgs } from "../_img/imgs";
import { COMP_FONTS } from "../_settings/settings";
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

interface ProfileTextProps {
  profileText: string;
  profileTextPlaceholder: string;
  isProfileTextVisible: boolean;
}

const TimeTableArtist = ({
  profileText,
  profileTextPlaceholder,
  isProfileTextVisible,
}: ProfileTextProps) => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  if (!isProfileTextVisible) return <></>;
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
      }}
      className="absolute z-40 flex justify-center items-center "
    >
      <div
        style={{
          position: "absolute",
          height: 100,
          width: 750,
          zIndex: 20,
          top: 2044,
          left: 212,
          rotate: "-3deg",
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: "#882449",
            fontFamily: COMP_FONTS.ARTIST,
            fontWeight: 700,
          }}
          className="text-center"
          maxFontSize={90}
        >
          {profileText
            ? "ART : " + profileText
            : "ART : " + profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        src={Imgs["first"]["artist"].src}
        draggable={false}
        className="object-cover"
        alt="artist"
      />
    </div>
  );
};

export default TimeTableArtist;
