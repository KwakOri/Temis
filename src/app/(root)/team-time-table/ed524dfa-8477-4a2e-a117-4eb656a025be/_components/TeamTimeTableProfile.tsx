import { TTheme } from '@/types/time-table/theme';
import { PropsWithChildren } from 'react';
import { Imgs } from '../_img/imgs';
import {
  profileImageHeight,
  profileImageWidth,
  templateSize,
} from '../_settings/settings';

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
        width: profileImageWidth,
        height: profileImageHeight,
        position: 'absolute',
        top: 356,
        left: 3036,
        zIndex: 10,
        rotate: '7.5deg',
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
        width: 4096,
        height: 2304,
        position: 'absolute',
        zIndex: 10,
      }}
    >
      <img src={Imgs['first']['board'].src} alt={'board'} draggable={false} />
    </div>
  );
};

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={`absolute flex justify-center -z-10`}
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

const TeamTimeTableProfile = ({
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

export default TeamTimeTableProfile;
