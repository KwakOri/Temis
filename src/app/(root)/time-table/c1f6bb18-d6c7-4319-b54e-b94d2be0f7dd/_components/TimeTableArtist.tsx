import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { Imgs } from '../_img/imgs';
import { COMP_FONTS, templateSize } from '../_settings/settings';

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
        width: templateSize.width,
        height: templateSize.height,
      }}
      className="absolute z-40 flex justify-end items-center "
    >
      <div
        style={{
          position: 'absolute',
          height: 120,
          width: 600,
          zIndex: 20,
          top: 2000,
          left: 2724,
          rotate: '9deg',
        }}
        className="flex justify-center items-center "
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: '#ffffff',
            fontFamily: COMP_FONTS.ARTIST,
            letterSpacing: 1,
            fontWeight: 400,
          }}
          className="text-center"
          maxFontSize={80}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        className="object-cover w-full h-full"
        src={Imgs['first']['artist'].src.replace('./', '/')}
        draggable={false}
        alt="memo"
      />
    </div>
  );
};

export default TimeTableArtist;
