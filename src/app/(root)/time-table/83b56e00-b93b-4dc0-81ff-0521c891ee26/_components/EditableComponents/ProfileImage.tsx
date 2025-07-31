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
      className={` absolute top-2 right-6 z-10 rounded-md flex justify-center text-white rotate-4`}
      style={{
        width: profileFrameWidth,
        height: profileFrameHeight,
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
        <p
          style={{
            fontFamily: fontOption.primary,
            color: colors[currentTheme]["secondary"],
          }}
          className="text-center"
        >
          {profileText ? profileText : placeholders.profileText}
        </p>
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
