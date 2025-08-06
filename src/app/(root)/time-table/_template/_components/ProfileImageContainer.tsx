import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import Image from "next/image";
import { PropsWithChildren } from "react";
import { Imgs } from "../_img/imgs";
import {
  colors,
  fontOption,
  profileBackPlateHeight,
  profileBackPlateWidth,
  profileFrameHeight,
  profileFrameWidth,
  profileImageHeight,
  profileImageInfo,
  profileImageWidth,
  profileTextInfo,
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

const ProfileBackPlate = ({ currentTheme }: ProfileBackPlateProps) => {
  return (
    <div
      style={{
        top: 75,
        left: 51,
        position: "absolute",
        zIndex: "0",
        width: profileBackPlateWidth,
        height: profileBackPlateHeight,
      }}
    >
      <Image
        src={Imgs[currentTheme || "first"]["profileBG"].src.replace("./", "/")}
        alt="profileBG"
        className="object-cover"
        draggable={false}
        fill
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
        top: 66,
        left: 40,
        zIndex: profileImageInfo.arrange === "onTop" ? 20 : 10,
      }}
    >
      {imageSrc && (
        <Image
          fill
          className="object-cover"
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
      <Image
        src={Imgs["first"]["profileFrame"].src.replace("./", "/")}
        alt="frame"
        className="object-cover"
        fill
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
        color: colors["first"]["tertiary"],
        fontFamily: fontOption.primary,
        bottom: 62,
        left: 68,
        width: "100%",
        height: profileTextInfo.size.height,
      }}
      className="absolute z-30 flex justify-start items-center "
    >
      <ProfileTextTitle />
      <div
        style={{ width: 180, height: 80 }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{}}
          className="text-center"
          maxFontSize={profileTextInfo.font.maxSize}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
    </div>
  );
};

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={`absolute flex justify-center`}
      style={{
        width: 0,
        height: 0,
        transform: `rotate(0deg)`,
        top: 0,
        right: 0,
      }}
      draggable={false}
    >
      {children}
    </div>
  );
};

interface ProfileImageSectionProps {
  currentTheme: TTheme;
  imageSrc: string | null;
  profileText: string;
  profileTextPlaceholder: string;
  isProfileTextVisible: boolean;
}

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
        profileText={profileText}
        profileTextPlaceholder={profileTextPlaceholder}
        isProfileTextVisible={isProfileTextVisible}
      />

      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
      <ProfileBackPlate />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
