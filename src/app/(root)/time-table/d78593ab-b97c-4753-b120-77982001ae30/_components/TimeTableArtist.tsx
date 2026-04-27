import { VerticalResizeText } from '@/components/AutoResizeTextCard';
import { Imgs } from '../_img/imgs';
import { COMP_COLORS, COMP_FONTS } from '../_settings/settings';

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
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
      }}
      className="absolute z-50 flex justify-end items-center "
    >
      {isProfileTextVisible && (
        <div
          style={{
            position: 'absolute',
            height: 600,
            width: 200,
            zIndex: 20,
            top: 820,
            left: 0,
          }}
          className="flex justify-center items-center "
        >
          <VerticalResizeText
            style={{
              lineHeight: 1,
              color: COMP_COLORS.ARTIST,
              fontFamily: COMP_FONTS.ARTIST,
            }}
            className="text-center"
            maxFontSize={64}
          >
            {profileText ? profileText : profileTextPlaceholder}
          </VerticalResizeText>
        </div>
      )}
      <img
        src={
          Imgs['first'][isProfileTextVisible ? 'artist_on' : 'artist_off'].src
        }
        draggable={false}
        className="object-cover"
        alt="artist"
      />
    </div>
  );
};

export default TimeTableArtist;
