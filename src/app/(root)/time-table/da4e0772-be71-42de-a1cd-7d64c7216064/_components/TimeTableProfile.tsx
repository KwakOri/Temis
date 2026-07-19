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

interface TimeTableProfileProps {
  currentTheme: TTheme;
  imageSrc: string | null;
}

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  return (
    <div
      style={{
        ...CARD_SIZES.PROFILE,

        position: 'absolute',
        top: 44,
        left: 2580,
        zIndex: 10,
        rotate: '3.6deg',
      }}
    >
      {imageSrc && (
        <img
          className="object-cover w-full h-full"
          src={imageSrc}
          alt={'profile'}
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
        src={Imgs['first']['frame'].src.replace('./', '/')}
        alt="frame"
        className="object-cover"
        draggable={false}
      />
    </div>
  );
};

const ProfileBackPlate = ({}: ProfileBackPlateProps) => {
  return (
    <div
      style={{
        ...CARD_SIZES.FRAME,
        zIndex: 0,
        position: 'absolute',
      }}
    >
      <img
        src={Imgs['first']['plate'].src.replace('./', '/')}
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
      className={`absolute flex justify-center z-20`}
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

const TimeTableProfile = ({
  currentTheme,
  imageSrc,
}: TimeTableProfileProps) => {
  return (
    <ProfileImageContainer>
      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
      <ProfileBackPlate />
    </ProfileImageContainer>
  );
};

export default TimeTableProfile;
