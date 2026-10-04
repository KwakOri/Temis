"use client";

import { TTheme } from '@/types/time-table/theme';
import { PropsWithChildren } from 'react';
import { Imgs as LocalImgs } from '../_img/imgs';
import { CARD_SIZES } from '../_settings/settings';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

interface ProfileBackPlateProps {
  currentTheme?: TTheme;
}

interface ProfileImageProps {
  imageSrc: string | null;
}

interface TimeTableProfileProps {
  currentTheme: TTheme;
  imageSrc: string | null;
}

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <>
      {imageSrc ? (
        <div
          style={{
            ...CARD_SIZES.PROFILE,
            position: 'absolute',
            top: 10,
            left: 0,
            zIndex: 10,
          }}
          className="bg-black/30"
        >
          <img
            className="object-cover w-full h-full"
            src={imageSrc}
            alt={'placeholder'}
          />
        </div>
      ) : (
        <img
          className="absolute inset-0 z-10"
          src={Imgs['first']['placeholder'].src}
          alt={'placeholder'}
        />
      )}
    </>
  );
};

const ProfileFrame = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <div
      style={{
        ...CARD_SIZES.FRAME,
        zIndex: 20,
        position: 'absolute',
      }}
    >
      <img
        src={Imgs['first']['profile'].src}
        alt="frame"
        className="object-cover"
        draggable={false}
      />
    </div>
  );
};

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={`absolute flex justify-center z-10`}
      style={{
        width: 1920,
        height: 1080,
      }}
      draggable={false}
    >
      {children}
    </div>
  );
};

const TimeTableProfile = ({
  currentTheme,
  imageSrc,
}: TimeTableProfileProps) => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <ProfileImageContainer>
      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
      <img
        className="absolute inset-0 -z-10"
        src={Imgs['first']['board'].src}
        alt={'placeholder'}
      />
    </ProfileImageContainer>
  );
};

export default TimeTableProfile;
