import { AutoResizeText } from '@/components/AutoResizeTextCard';
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
        width: 1920,
        height: 1080,
      }}
      className="absolute z-40 flex justify-end items-center "
    >
      <div
        style={{
          position: 'absolute',
          height: 40,
          width: 400,
          zIndex: 20,
          top: 170,
          left: 1220,
        }}
        className="flex justify-start items-center"
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: '#B3B3B3',
            fontFamily: COMP_FONTS.ARTIST,
          }}
          className="text-center"
          maxFontSize={16}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
    </div>
  );
};

export default TimeTableArtist;
