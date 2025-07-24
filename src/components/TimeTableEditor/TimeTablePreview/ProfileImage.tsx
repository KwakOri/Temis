import React from "react";
import { profileImageHeight, profileImageWidth } from "./types";

interface ProfileImageProps {
  imageSrc: string | null;
}

const ProfileImage: React.FC<ProfileImageProps> = ({ imageSrc }) => {
  return (
    <div
      style={{
        width: profileImageWidth,
        height: profileImageHeight,
      }}
      className={` absolute right-8 -top-30 z-10 rounded-md flex justify-center items-center text-white rotate-6`}
    >
      <div className="absolute z-20 ">
        <img
          src={"/img/frame.png"}
          alt="preview"
          className="w-full h-full object-cover"
        />
      </div>
      <div
        style={{
          width: profileImageWidth * 0.8,
          height: profileImageHeight * 0.8,
        }}
        className="relative left-4 top-20"
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex justify-center items-center bg-[#4a5889]">
            <p className="text-white text-center">프로필 이미지 자리</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileImage;
