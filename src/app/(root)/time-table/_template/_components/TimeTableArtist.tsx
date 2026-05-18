import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { Imgs } from '../_img/imgs';
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
  if (!isProfileTextVisible)
    return (
      <div
        style={{
          width: 4000,
          height: 2250,
        }}
        className="absolute z-50 flex justify-end items-center "
      >
        <img
          src={Imgs['first']['artist_off'].src}
          draggable={false}
          className="object-cover"
          alt="artist"
        />
      </div>
    );
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
      }}
      className="absolute z-50 flex justify-end items-center "
    >
      <div
        style={{
          position: 'absolute',
          height: 160,
          width: 800,
          zIndex: 20,
          top: 1936,
          left: 352,
          rotate: '3.1deg',
        }}
        className="flex justify-end items-center "
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: COMP_COLORS.ARTIST,
            fontFamily: COMP_FONTS.ARTIST,
          }}
          className="text-right"
          maxFontSize={MAX_FONT_SIZES.ARTIST}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        src={Imgs['first']['artist_on'].src}
        draggable={false}
        className="object-cover"
        alt="artist"
      />
    </div>
  );
};

export default TimeTableArtist;
