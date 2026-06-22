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

const ProfileBackPlate = () => {
  return (
    <div
      style={{
        ...CARD_SIZES.FRAME,
        zIndex: 0,
        position: 'absolute',
      }}
    >
      <img
        src={Imgs['first']['profile_board'].src.replace('./', '/')}
        alt="profile_board"
        className="object-cover"
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
        position: 'absolute',
        top: 404,
        left: 2276,
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
        src={Imgs['first']['profile_frame'].src.replace('./', '/')}
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
      className={`absolute inset-0 flex justify-center z-20`}
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
