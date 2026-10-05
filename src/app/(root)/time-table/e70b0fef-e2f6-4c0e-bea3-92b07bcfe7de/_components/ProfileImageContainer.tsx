"use client";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";

import { PropsWithChildren } from "react";
import { Imgs as LocalImgs } from "../_img/imgs";
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
} from "../_settings/settings";
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

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
  const Imgs = useLegacyTemplateImages(LocalImgs);
  return (
    <div
      style={{
        top: 20,
        right: 24,
        position: "absolute",
        zIndex: "0",
        width: profileBackPlateWidth,
        height: profileBackPlateHeight,
      }}
    >
      <img
        src={Imgs[currentTheme || "first"]["profileBG"].src}
        alt="profileBG"
        className="object-cover"
        draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
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
        scale: "94%",
        position: "absolute",
        top: 16,
        right: 32,
        transform: `rotate(${profileImageInfo.rotation}deg)`,
        zIndex: profileImageInfo.arrange === "onTop" ? 20 : 10,
      }}
    >
      {imageSrc && (
        <img
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          className="object-cover"
          src={imageSrc}
          alt={"placeholder"}
        />
      )}
    </div>
  );
};

const ProfileFrame = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
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
        src={Imgs["first"]["profileFrame"].src}
        alt="frame"
        className="object-cover"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
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
  const Imgs = useLegacyTemplateImages(LocalImgs);
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
      <img
        src={(Imgs["first"]["artist" as keyof (typeof Imgs)["first"]]).src}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
};

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={`absolute flex justify-center`}
      style={{
        width: 1496,
        height: 1707,
        transform: `rotate(0deg)`,
        top: 376,
        right: 164,
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
