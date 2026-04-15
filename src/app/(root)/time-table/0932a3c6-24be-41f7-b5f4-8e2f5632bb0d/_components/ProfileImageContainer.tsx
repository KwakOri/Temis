import { TTheme } from '@/types/time-table/theme';
import { PropsWithChildren } from 'react';
import { Imgs } from '../_img/imgs';
import { CARD_SIZES } from '../_settings/settings';

interface ProfileBackPlateProps {
  currentTheme?: TTheme;
}

interface ProfileImageProps {
  imageSrc: string | null;
}

interface ProfileImageSectionProps {
  currentTheme: TTheme;
  imageSrc: string | null;
}

const ProfileBackPlate = ({ currentTheme }: ProfileBackPlateProps) => {
  return (
    <div
      style={{
        zIndex: '0',
      }}
      className="absolute inset-0"
    >
      <img
        src={Imgs[currentTheme || 'first']['profileBG'].src.replace('./', '/')}
        alt="profileBG"
        className="object-cover w-full h-full"
        draggable={false}
      />
    </div>
  );
};

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  return (
    <div
      style={{
        ...CARD_SIZES.PROFILE,
        rotate: '6.8deg',
        position: 'absolute',
        top: 456,
        left: 2800,
        zIndex: 10,
      }}
    >
      {imageSrc && (
        <img
          className="object-cover w-full h-full"
          src={imageSrc}
          alt={'placeholder'}
        />
      )}
    </div>
  );
};

const ProfileFrame = () => {
  return (
    <div
      style={{
        ...CARD_SIZES.FRAME,
        zIndex: 20,
        position: 'absolute',
      }}
    >
      <img
        src={Imgs['first']['profileFrame'].src.replace('./', '/')}
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
      className={`absolute flex justify-center z-30`}
      style={{
        width: 4000,
        height: 2250,
      }}
      draggable={false}
    >
      {children}
    </div>
  );
};

const ProfileImageSection = ({
  currentTheme,
  imageSrc,
}: ProfileImageSectionProps) => {
  return (
    <ProfileImageContainer>
      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
      <ProfileBackPlate />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
