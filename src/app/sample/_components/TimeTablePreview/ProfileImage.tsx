import { Imgs } from "@/app/sample/_img/imgs";
import {
  colors,
  fontOption,
  profileFrameHeight,
  profileFrameWidth,
  profileImageHeight,
  profileImageWidth,
  TTheme,
} from "@/app/sample/_settings/settings";
import Image from "next/image";
import React from "react";

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
      className={` absolute right-0 z-10 rounded-md flex justify-center text-white rotate-6`}
      style={{
        width: profileFrameWidth,
        height: profileFrameHeight,
      }}
    >
      <div
        style={{
          color: colors[currentTheme]["primary"],
        }}
        className="absolute z-30 bottom-27 right-11 text-[36px] w-[220px] h-[60px] flex justify-center items-center"
      >
        <p
          style={{
            fontFamily: fontOption.primary,
          }}
          className="text-center"
        >
          {profileText}
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
          src={Imgs[currentTheme]["profile"]}
          width={profileFrameWidth}
          height={profileFrameHeight}
          alt="preview"
          className="w-full h-full object-cover"
        />
      </div>
      <div
        style={{
          width: profileImageWidth + "px",
          height: profileImageHeight + "px",
        }}
        className="relative mt-6"
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt="preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            style={{
              backgroundColor: colors[currentTheme].tertiary,
            }}
            className={`w-full h-full flex justify-center items-center`}
          >
            <p
              style={{
                fontFamily: fontOption.primary,
              }}
              className="text-white text-center text-[32px]"
            >
              프로필 이미지 자리
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileImage;
