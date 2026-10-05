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
      className="absolute z-30 flex justify-end items-center "
    >
      <p
        style={{
          color: '#938b7e',
          fontFamily: COMP_FONTS.ARTIST,
          fontWeight: 700,
          position: 'absolute',
          height: 200,
          width: 700,
          zIndex: 20,
          top: 1660,
          left: 2500,
          rotate: '3.6deg',
          fontSize: 80,
        }}
        className="flex justify-center items-center "
      >
        ARTIST
      </p>
      <div
        style={{
          position: 'absolute',
          height: 200,
          width: 700,
          zIndex: 20,
          top: 1840,
          left: 2500,
          rotate: '3.6deg',
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: '#938b7e',
            fontFamily: COMP_FONTS.ARTIST,
            fontWeight: 700,
          }}
          className="text-center"
          maxFontSize={100}
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
