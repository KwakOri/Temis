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
      className="absolute z-40 flex justify-center items-center "
    >
      <div
        style={{
          position: "absolute",
          height: 160,
          width: 800,
          zIndex: 20,
          top: 1572,
          left: 500,
          rotate: "-4deg",
        }}
        className="flex justify-end items-center "
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: BASE_COLORS.first.primary,
            fontFamily: COMP_FONTS.ARTIST,
          }}
          className="text-right"
          maxFontSize={90}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      {/* <img
        src={Imgs['first']['artist'].src}
        draggable={false}
        className="object-cover"
        alt="artist"
      /> */}
    </div>
  );
};

export default TimeTableArtist;
