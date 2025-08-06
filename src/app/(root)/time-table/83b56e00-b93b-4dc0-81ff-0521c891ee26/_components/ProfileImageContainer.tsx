import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import ProfileImage from "@/components/TimeTable/ProfileImage";
import { TTheme } from "@/types/time-table/theme";
import Image from "next/image";
import React from "react";
import { Imgs } from "../_img/imgs";
import {
  colors,
  fontOption,
  profileFrameHeight,
  profileFrameWidth,
  profileImageHeight,
  profileImageInfo,
  profileImageWidth,
  profileTextInfo,
} from "../_settings/settings";

interface ProfileTextProps {
  profileText: string;
  profileTextPlaceholder: string;
  isProfileTextVisible: boolean;
}

const ProfileTextTitle = () => {
  return (
    <p style={{ fontSize: 28, width: 140, position: "relative" }}>
      화공 이름 <span className="relative bottom-1">::</span>
    </p>
  );
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
        bottom: 70,
        left: 56,
        width: "100%",
        height: profileTextInfo.size.height,
        filter: "blur(0.5px)",
      }}
      className="absolute z-30 flex justify-start items-center "
    >
      <ProfileTextTitle />
      <div
        style={{ width: 200, height: 80 }}
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

interface ProfileImageProps {
  currentTheme: TTheme;
  imageSrc: string | null;
  profileText: string;
  profileTextPlaceholder: string;
  isProfileTextVisible: boolean;
}

const ProfileImageContainer: React.FC<ProfileImageProps> = ({
  currentTheme,
  imageSrc,
  profileText,
  profileTextPlaceholder,
  isProfileTextVisible,
}) => {
  const formattedImageSrc = imageSrc
    ? imageSrc.startsWith("/")
      ? imageSrc
      : imageSrc.replace("./", "/")
    : Imgs[currentTheme]["placeholder"].src.replace("./", "/");

  return (
    <div
      className={` absolute rounded-md flex justify-center text-white`}
      style={{
        width: profileFrameWidth,
        height: profileFrameHeight,
        transform: `rotate(${profileImageInfo.rotation}deg)`,
        top: `${profileImageInfo.position.top}px`,
        right: `${profileImageInfo.position.right}px`,
      }}
      draggable={false}
    >
      {isProfileTextVisible && (
        <>
          <ProfileText
            isProfileTextVisible={isProfileTextVisible}
            profileText={profileText}
            profileTextPlaceholder={profileTextPlaceholder}
          />
        </>
      )}
      <div
        className="absolute"
        style={{
          width: profileFrameWidth + "px",
          height: profileFrameHeight + "px",
          zIndex: profileImageInfo.arrange === "onTop" ? 10 : 20,
        }}
      >
        <Image
          src={Imgs[currentTheme]["profile"].src.replace("./", "/")}
          alt="preview"
          className="w-full h-full object-cover"
          width={profileFrameWidth}
          height={profileFrameHeight}
          draggable={false}
        />
      </div>
      <div
        style={{
          width: profileImageWidth + "px",
          height: profileImageHeight + "px",
          zIndex: profileImageInfo.arrange === "onTop" ? 20 : 10,
        }}
        className="relative mt-14"
      >
        <div
          style={{
            boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.3) inset",
          }}
          className="absolute inset-0 z-30"
        ></div>
        <ProfileImage imageSrc={formattedImageSrc} />
      </div>
    </div>
  );
};

export default ProfileImageContainer;
