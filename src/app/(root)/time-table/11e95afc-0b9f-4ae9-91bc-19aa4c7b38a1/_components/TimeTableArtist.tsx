import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { COMP_COLORS, COMP_FONTS, MAX_FONT_SIZES } from '../_settings/settings';

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
      className="absolute z-40 flex justify-end items-center "
    >
      <div
        style={{
          position: 'absolute',
          height: 140,
          width: 752,
          zIndex: 20,
          top: 424,
          left: 392,
          rotate: '-4.7deg',
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: COMP_COLORS.ARTIST,
            fontFamily: COMP_FONTS.ARTIST,
            fontWeight: 700,
          }}
          className="text-center"
          maxFontSize={MAX_FONT_SIZES.ARTIST}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      {/* <img
        src={Imgs['first']['artist_on'].src}
        draggable={false}
        className="object-cover"
        alt="artist"
      /> */}
    </div>
  );
};

export default TimeTableArtist;
