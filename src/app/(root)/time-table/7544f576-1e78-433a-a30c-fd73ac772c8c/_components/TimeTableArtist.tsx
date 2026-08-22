import { AutoResizeText } from "@/components/AutoResizeTextCard";
import { Imgs } from "../_img/imgs";
import { BASE_COLORS, COMP_FONTS } from "../_settings/settings";

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
      className="absolute z-30 flex justify-center items-center "
    >
      <div
        style={{
          position: "absolute",
          height: 160,
          width: 560,
          zIndex: 20,
          top: 1972,
          left: 752,
          rotate: "4.6deg",
        }}
        className="flex justify-center items-center "
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: BASE_COLORS.first.secondary,
            fontFamily: COMP_FONTS.ARTIST,
          }}
          className="text-center"
          maxFontSize={64}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        src={Imgs["first"]["artist"].src}
        draggable={false}
        className="object-cover"
        alt="artist"
      />
    </div>
  );
};

export default TimeTableArtist;
