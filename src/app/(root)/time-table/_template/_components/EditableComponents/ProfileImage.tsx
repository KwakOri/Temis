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
  profileImage,
  profileImageHeight,
  profileImageWidth,
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
      className={` absolute z-10 rounded-md flex justify-center text-white`}
      style={{
        width: profileFrameWidth,
        height: profileFrameHeight,
        transform: `rotate(${profileImage.rotation})`,
        top: `${profileImage.position.top}px`,
        right: `${profileImage.position.right}px`,
      }}
      draggable={false}
    >
      <div
        style={{
          color: colors[currentTheme]["primary"],
          filter: "blur(0.8px)",
        }}
        className="absolute z-30 bottom-17 right-11 text-[32px] w-[220px] h-[60px] flex justify-center items-center "
      >
        <AutoResizeText
          style={{
            fontFamily: fontOption.primary,
            color: colors[currentTheme]["secondary"],
          }}
          className="text-center"
          maxFontSize={32}
          minFontSize={20}
        >
          {profileText ? profileText : placeholders.profileText}
        </AutoResizeText>
      </div>
      <div
        className="absolute z-20"
        style={{
          width: profileFrameWidth + "px",
          height: profileFrameHeight + "px",
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
        }}
        className="relative mt-14 z-20 "
      >
        <div
          style={{
            boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.3) inset",
          }}
          className="absolute inset-0 z-30"
        ></div>
        {imageSrc ? (
          <Image
            src={
              imageSrc.startsWith("/") ? imageSrc : imageSrc.replace("./", "/")
            }
            alt="preview"
            className="w-full h-full object-cover"
            fill
          />
        ) : (
          <div
            className={`w-full h-full flex justify-center items-center relative`}
          >
            <Image
              fill
              src={Imgs[currentTheme]["placeholder_image"].src.replace(
                "./",
                "/"
              )}
              alt={"placeholder"}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileImage;
