import { AutoResizeText } from "@/components/AutoResizeTextCard";
import { useTimeTableData } from "@/contexts/TimeTableContext";
import { TTheme } from "@/types/time-table/theme";
import { PropsWithChildren } from "react";
import { Imgs } from "../_img/imgs";
import {
  colors,
  fontOption,
  profileFrameHeight,
  profileFrameWidth,
  profileImageHeight,
  profileImageInfo,
  profileImageWidth,
} from "../_settings/settings";

interface ProfileBackPlateProps {
  currentTheme?: TTheme;
}

interface ProfileImageProps {
  imageSrc: string | null;
}

interface ProfileTextProps {
  profileText: string;
  profileTextPlaceholder: string;
  isProfileTextVisible: boolean;
}

interface ProfileImageSectionProps {
  currentTheme: TTheme;
  imageSrc: string | null;
  profileText: string;
  profileTextPlaceholder: string;
  isProfileTextVisible: boolean;
}

const ProfileBackPlate = ({ currentTheme }: ProfileBackPlateProps) => {
  return (
    <div
      style={{
        zIndex: "0",
      }}
      className="absolute inset-0"
    >
      <img
        src={Imgs[currentTheme || "first"]["profileBG"].src.replace("./", "/")}
        alt="profileBG"
        className="object-cover w-full h-full"
        draggable={false}
      />
    </div>
  );
};

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  return (
    <div
      style={{
        width: profileImageWidth,
        height: profileImageHeight,

        position: "absolute",
        top: -14,
        left: 66,
        rotate: "-7deg",
        zIndex: profileImageInfo.arrange === "onTop" ? 20 : 10,
      }}
    >
      {imageSrc && (
        <img
          className="object-cover w-full h-full"
          src={imageSrc}
          alt={"placeholder"}
        />
      )}
    </div>
  );
};

const ProfileFrame = () => {
  return (
    <div
      style={{
        width: profileFrameWidth,
        height: profileFrameHeight,
        zIndex: profileImageInfo.arrange === "onTop" ? 10 : 20,
        position: "absolute",
      }}
    >
      <img
        src={Imgs["first"]["profileFrame"].src.replace("./", "/")}
        alt="frame"
        className="object-cover"
        draggable={false}
      />
    </div>
  );
};

const ProfileText = ({
  profileText,
  profileTextPlaceholder,
  isProfileTextVisible,
}: ProfileTextProps) => {
  return (
    <div
      style={{
        color: colors["first"]["secondary"],
        fontFamily: fontOption.primary,

        width: 4000,
        height: 2250,
      }}
      className="absolute z-30 flex justify-end items-center "
    >
      {isProfileTextVisible && (
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 444,
            width: 680,
            height: 160,
            zIndex: 20,
            rotate: "-7deg",
            color: colors["first"]["primary"],
            fontFamily: fontOption.secondary,
            fontWeight: 500,
          }}
          className="flex justify-center items-center"
        >
          <AutoResizeText
            style={{ lineHeight: 1 }}
            className="text-center"
            maxFontSize={136}
          >
            {profileText ? profileText : profileTextPlaceholder}
          </AutoResizeText>
        </div>
      )}
      <img
        src={Imgs["first"][isProfileTextVisible ? "artist" : "noArtist"].src}
        className="object-cover"
        alt="artist"
      />
    </div>
  );
};

const ProfileMemo = () => {
  const { isMemoTextVisible, memoText } = useTimeTableData();
  return (
    <>
      {isMemoTextVisible && (
        <div
          className="flex justify-center items-center"
          style={{
            position: "absolute",
            bottom: 290,
            right: 100,
            width: 1200,
            height: 200,
            zIndex: 40,
            rotate: "11deg",
          }}
        >
          <AutoResizeText
            style={{
              color: colors["first"]["primary"],
              fontFamily: fontOption.primary,
              fontWeight: 700,
            }}
            maxFontSize={100}
          >
            {memoText || "메모를 작성해주세요"}
          </AutoResizeText>
        </div>
      )}
    </>
  );
};

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={`absolute flex justify-center z-10`}
      style={{
        width: 4000,
        height: 2250,
      }}
      draggable={false}
    >
      {children}
    </div>
  );
};

const ProfileImageSection = ({
  currentTheme,
  imageSrc,
  profileText,
  profileTextPlaceholder,
  isProfileTextVisible,
}: ProfileImageSectionProps) => {
  return (
    <ProfileImageContainer>
      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
      <ProfileText
        isProfileTextVisible={isProfileTextVisible}
        profileText={profileText}
        profileTextPlaceholder={profileTextPlaceholder}
      />
      <ProfileMemo />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
