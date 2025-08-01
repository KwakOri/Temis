import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import Image from "next/image";
import React from "react";
import { Imgs } from "../../_img/imgs";
import { placeholders, TTheme } from "../../_settings/general";
import {
  colors,
  fontOption,
  profileFrameHeight,
  profileFrameWidth,
  profileImageHeight,
  profileImageInfo,
  profileImageWidth,
  profileTextInfo,
} from "../../_settings/settings";

interface ProfileImageProps {
  currentTheme: TTheme;
  imageSrc: string | null;
  profileText: string;
}

const ProfileImage: React.FC<ProfileImageProps> = ({
  currentTheme,
  imageSrc,
  profileText,
}) => {
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
          color: colors[currentTheme]["primary"],
          filter: "blur(0.8px)",
          bottom: profileTextInfo.position.bottom,
          right: profileTextInfo.position.right,
          width: profileTextInfo.size.width,
          height: profileTextInfo.size.height,
        }}
        className="absolute z-30 flex justify-center items-center "
      >
        <AutoResizeText
          style={{
            fontFamily: fontOption.primary,
            color: colors[currentTheme]["secondary"],
          }}
          className="text-center"
          padding={{ right: 8, left: 8 }}
          maxFontSize={profileTextInfo.font.maxSize}
          minFontSize={profileTextInfo.font.minSize}
        >
          {profileText ? profileText : placeholders.profileText}
        </AutoResizeText>
      </div>
      <div
        className="absolute"
        style={{
          width: profileFrameWidth + "px",
          height: profileFrameHeight + "px",
          zIndex: profileImageInfo.arrange === "onTop" ? "z-10" : "z-20",
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
          zIndex: profileImageInfo.arrange === "onTop" ? "z-20" : "z-10",
        }}
        className="relative mt-14"
      >
        <div
          style={{
            boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.3) inset",
          }}
          className="absolute inset-0 z-30"
        ></div>

        <div
          className={`w-full h-full flex justify-center items-center relative`}
        >
          <Image
            fill
            src={
              imageSrc
                ? imageSrc.startsWith("/")
                  ? imageSrc
                  : imageSrc.replace("./", "/")
                : Imgs[currentTheme]["placeholder_image"].src.replace("./", "/")
            }
            alt={"placeholder"}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileImage;
