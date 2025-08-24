import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
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
        bottom: 264,
        right: 18,
        transform: `rotate(-7.5deg)`,
        zIndex: profileImageInfo.arrange === "onTop" ? 20 : 10,
      }}
      className=""
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

const ProfileTextTitle = () => {
  return <p style={{ fontSize: 38, width: 172 }}>ART BY ::</p>;
};

const ProfileText = ({
  profileText,
  profileTextPlaceholder,
  isProfileTextVisible,
}: ProfileTextProps) => {
  if (!isProfileTextVisible) return null;
  return (
    <div
      style={{
        color: colors["first"]["secondary"],
        fontFamily: fontOption.primary,
        bottom: 96,
        right: 492,
        width: 1216,
        height: 370,
      }}
      className="absolute z-30 flex justify-start items-center "
    >
      <div
        style={{
          position: "relative",
          top: 80,
          left: 250,
          width: 900,
          height: 160,

          zIndex: 20,
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText style={{}} className="text-center" maxFontSize={80}>
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      {/* <img
        src={Imgs["first"]["artist"].src}
        alt="artist"
        className="absolute inset-0"
      /> */}
    </div>
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
      {/* <ProfileText
        isProfileTextVisible={isProfileTextVisible}
        profileTextPlaceholder={profileTextPlaceholder}
        profileText={profileText}
      /> */}

      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
