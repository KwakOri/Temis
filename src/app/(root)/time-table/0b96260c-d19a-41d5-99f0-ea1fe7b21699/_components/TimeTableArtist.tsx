"use client";

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { Imgs as LocalImgs } from '../_img/imgs';
import { COMP_COLORS, COMP_FONTS, MAX_FONT_SIZES } from '../_settings/settings';
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
      className="absolute z-40 flex justify-end items-center "
    >
      <div
        style={{
          position: 'absolute',
          width: 540,
          height: 240,
          zIndex: 20,
          top: 1360,
          left: 526,
          rotate: '-10.6deg',
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: COMP_COLORS.ARTIST,
            fontFamily: COMP_FONTS.ARTIST,
            fontWeight: 700,
          }}
          className="text-center"
          maxFontSize={MAX_FONT_SIZES.ARTIST}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        src={Imgs['first']['artist'].src}
        draggable={false}
        className="object-cover"
        alt="artist"
      />
    </div>
  );
};

export default TimeTableArtist;
