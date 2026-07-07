import { TTheme } from '@/types/time-table/theme';
import { PropsWithChildren } from 'react';
import { Imgs } from '../_img/imgs';
import { templateSize } from '../_settings/settings';

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
        width: 1108,
        height: 1300,
        position: 'absolute',
        top: 280,
        left: 2844,
        zIndex: 10,
        rotate: '6.5deg',
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
        width: templateSize.width,
        height: templateSize.height,
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

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={`absolute flex justify-center z-20`}
      style={{
        width: templateSize.width,
        height: templateSize.height,
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
    </ProfileImageContainer>
  );
};

export default TimeTableProfile;
