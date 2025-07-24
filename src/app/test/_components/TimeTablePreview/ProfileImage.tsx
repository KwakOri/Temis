import { Imgs } from "@/app/test/_img/imgs";
import { colors } from "@/app/test/_styles/colors";
import Image from "next/image";
import React from "react";
import { profileImageHeight, profileImageWidth, ThemeTypes } from "./types";

interface ProfileImageProps {
  currentTheme: ThemeTypes;
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
        width: profileImageWidth,
        height: profileImageHeight,
      }}
    >
      <div
        style={{
          color: colors[currentTheme]["tertiary"],
        }}
        className="absolute z-30 bottom-27 right-11 text-[36px] w-[220px] h-[60px] text-black flex justify-center items-center"
      >
        <p
          style={{
            fontFamily: "Ownglyph_ParkDaHyun",
          }}
          className="text-center"
        >
          {profileText}
        </p>
      </div>
      <div
        className="absolute z-20"
        style={{
          width: profileImageWidth,
          height: profileImageHeight,
        }}
      >
        <Image
          src={Imgs[currentTheme]["profile"]}
          width={profileImageWidth}
          height={profileImageHeight}
          alt="preview"
          className="w-full h-full object-cover"
        />
      </div>
      <div
        style={{
          width: 440,
          height: 480,
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
                fontFamily: "Ownglyph_ParkDaHyun",
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
