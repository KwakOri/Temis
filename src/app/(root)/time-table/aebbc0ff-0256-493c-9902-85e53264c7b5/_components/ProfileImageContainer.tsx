import { AutoResizeText } from "@/components/AutoResizeTextCard";
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
        bottom: 68,
        left: 104,
        rotate: "-6.5deg",
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
        width: 664,
        height: 248,
        left: 148,
        top: 500,
      }}
      className="absolute z-50 flex justify-center items-center"
    >
      <div
        style={{
          zIndex: 20,
          color: colors["first"]["tertiary"],
          fontFamily: fontOption.primary,
          rotate: "-6.8deg",
          height: 100,
          width: 332,
          fontWeight: 400,
          opacity: 0.9,
        }}
        className="flex justify-center items-center mt-1"
      >
        <AutoResizeText
          style={{ lineHeight: 0 }}
          className="text-center"
          maxFontSize={48}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        src={Imgs["first"]["artist"].src}
        className="absolute w-full h-full object-cover"
        alt="artist"
      />
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
      <ProfileText
        isProfileTextVisible={isProfileTextVisible}
        profileText={profileText}
        profileTextPlaceholder={profileTextPlaceholder}
      />
      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
