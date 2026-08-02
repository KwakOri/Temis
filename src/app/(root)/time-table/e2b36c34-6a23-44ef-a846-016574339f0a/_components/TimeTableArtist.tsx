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
          height: 100,
          width: 410,
          zIndex: 20,
          top: 2110,
          left: 3032,
          rotate: '7.3deg',
        }}
        className="flex justify-center items-center "
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: '#81331A',
            fontFamily: COMP_FONTS.ARTIST,
          }}
          className="text-center"
          maxFontSize={50}
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
