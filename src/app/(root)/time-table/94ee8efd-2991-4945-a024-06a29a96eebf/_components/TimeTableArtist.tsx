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
    <div className="absolute inset-0 z-40 flex justify-end items-center ">
      <div
        style={{
          position: 'absolute',
          height: 80,
          width: 1000,
          zIndex: 20,
          top: 328,
          left: 2374,
        }}
        className="flex justify-start items-center "
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: '#3B47D7',
            fontFamily: COMP_FONTS.ARTIST,
          }}
          className="text-center"
          maxFontSize={40}
        >
          {profileText
            ? 'ARTIST :// ' + profileText
            : 'ARTIST :// ' + profileTextPlaceholder}
        </AutoResizeText>
      </div>
    </div>
  );
};

export default TimeTableArtist;
