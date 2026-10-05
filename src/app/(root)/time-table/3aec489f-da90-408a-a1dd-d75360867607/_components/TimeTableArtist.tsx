"use client";

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { Imgs as LocalImgs } from '../_img/imgs';
import { COMP_FONTS } from '../_settings/settings';
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
          position: 'absolute',
          height: 160,
          width: 600,
          zIndex: 20,
          top: 2048,
          left: 3280,
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: '#F7F6F5',
            fontFamily: COMP_FONTS.ARTIST,
          }}
          className="text-center"
          maxFontSize={70}
        >
          {profileText ? '@ ' + profileText : '@ ' + profileTextPlaceholder}
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
