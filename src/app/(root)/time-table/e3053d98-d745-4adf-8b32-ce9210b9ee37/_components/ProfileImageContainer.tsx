import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import ProfileImage from "@/components/TimeTable/ProfileImage";
import { TTheme } from "@/types/time-table/theme";
import Image from "next/image";
import React from "react";
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

interface ProfileImageProps {
  currentTheme: TTheme;
  imageSrc: string | null;
  profileText: string;
  profileTextPlaceholder: string;
}

const ProfileImageContainer: React.FC<ProfileImageProps> = ({
  currentTheme,
  imageSrc,
  profileText,
  profileTextPlaceholder,
}) => {
  // const formattedImageSrc = imageSrc
  //   ? imageSrc.startsWith("/")
  //     ? imageSrc
  //     : imageSrc.replace("./", "/")
  //   : Imgs[currentTheme]["placeholder"].src.replace("./", "/");

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
      <div
        style={{
          color: colors[currentTheme]["tertiary"],
          fontFamily: fontOption.primary,
          filter: "blur(0.7px)",
          bottom: 62,
          left: 68,
          width: "100%",
          height: profileTextInfo.size.height,
        }}
        className="absolute z-30 flex justify-start items-center "
      >
        <p style={{ fontSize: 38, width: 172 }}>ART BY ::</p>
        <div
          style={{ width: 180, height: 80 }}
          className="flex justify-center items-center ml-2"
        >
          <AutoResizeText
            style={{}}
            className="text-center"
            padding={{}}
            maxFontSize={profileTextInfo.font.maxSize}
            minFontSize={profileTextInfo.font.minSize}
          >
            {profileText ? profileText : profileTextPlaceholder}
          </AutoResizeText>
        </div>
      </div>
      <div
        className="absolute"
        style={{
          width: profileFrameWidth + "px",
          height: profileFrameHeight + "px",
          zIndex: profileImageInfo.arrange === "onTop" ? 10 : 20,
        }}
      >
        <Image
          src={Imgs[currentTheme]["profileFrame"].src.replace("./", "/")}
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
          position: "absolute",
          top: 66,
          left: 40,
          zIndex: profileImageInfo.arrange === "onTop" ? 20 : 10,
        }}
      >
        {imageSrc && <ProfileImage imageSrc={imageSrc} />}
      </div>
      <div
        style={{
          top: 75,
          left: 51,
          position: "absolute",
          zIndex: "0",
        }}
      >
        <Image
          src={Imgs[currentTheme]["profileBG"].src.replace("./", "/")}
          alt="profileBG"
          className="object-cover"
          width={profileBackPlateWidth}
          height={profileBackPlateHeight}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default ProfileImageContainer;
