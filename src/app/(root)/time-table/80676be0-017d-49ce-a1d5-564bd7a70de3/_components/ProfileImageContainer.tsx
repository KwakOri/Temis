import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import Image from "next/image";
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
  return imageSrc ? (
    <div
      style={{
        width: profileImageWidth,
        height: profileImageHeight,

        position: "absolute",
        bottom: 184,
        left: -88,
        transform: `rotate(-10deg)`,
        zIndex: profileImageInfo.arrange === "onTop" ? 20 : 10,
      }}
    >
      {
        <Image
          fill
          className="object-cover"
          src={imageSrc}
          alt={"placeholder"}
        />
      }
    </div>
  ) : (
    <div
      style={{
        width: profileImageWidth,
        height: profileImageHeight,

        position: "absolute",
        bottom: -80,
        left: -170,
        transform: `rotate(-10deg)`,
        scale: 1.5,
        zIndex: profileImageInfo.arrange === "onTop" ? 20 : 10,
      }}
    >
      {
        <Image
          fill
          className="object-cover"
          src={Imgs["first"]["img"]}
          alt={"placeholder"}
        />
      }
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
        color: colors["first"]["quaternary"],
        fontFamily: fontOption.primary,
        bottom: -120,
        right: 300,
        width: 738,
        height: 433,
      }}
      className="absolute z-30 flex justify-start items-center "
    >
      <div
        style={{
          position: "relative",
          top: 48,
          left: 76,
          width: 480,
          height: 120,
          transform: "rotate(12deg) ",
          zIndex: 20,
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText style={{}} className="text-center" maxFontSize={56}>
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
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
      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
