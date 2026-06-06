import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { Imgs } from '../_img/imgs';
import { COMP_FONTS } from '../_settings/settings';

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
  if (!isProfileTextVisible) return <></>;
  return (
    <div className="absolute inset-0 z-40 flex justify-end items-center ">
      <div
        style={{
          position: 'absolute',
          height: 160,
          width: 700,
          zIndex: 20,
          top: 2020,
          left: 3200,
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: '#1D56AD',
            fontFamily: COMP_FONTS.ARTIST,
          }}
          className="text-center"
          maxFontSize={80}
        >
          {profileText ? '@ ' + profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        src={Imgs['first']['artist'].src}
        className="absolute inset-0"
        alt="artist"
        draggable={false}
      />
    </div>
  );
};

export default TimeTableArtist;
