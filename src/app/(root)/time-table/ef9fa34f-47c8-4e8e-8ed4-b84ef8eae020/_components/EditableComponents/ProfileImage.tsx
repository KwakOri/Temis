import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import Image from "next/image";
import React from "react";
import { Imgs } from "../../_img/imgs";
import { placeholders, TTheme } from "../../_settings/general";
import {
  colors,
  fontOption,
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
      className={` absolute inset-0 rounded-md flex justify-center text-white`}
      draggable={false}
    >
      <div
        className="absolute inset-0"
        style={{
          zIndex: profileImageInfo.arrange === "onTop" ? "10" : "20",
        }}
      >
        <Image
          src={Imgs[currentTheme]["profile"].src.replace("./", "/")}
          alt="preview"
          className="w-full h-full object-cover"
          fill
          draggable={false}
        />
      </div>
      <div
        style={{
          width: profileImageWidth + "px",
          height: profileImageHeight + "px",
          zIndex: profileImageInfo.arrange === "onTop" ? "20" : "10",
        }}
        className="absolute right-0"
      >
        {imageSrc ? (
          <Image
            fill
            className="object-cover"
            style={{
              scale: "1.1",
              transform: `translateX(-5%)`,
            }}
            src={
              imageSrc.startsWith("/") ? imageSrc : imageSrc.replace("./", "/")
            }
            alt={"placeholder"}
          />
        ) : (
          <Image
            fill
            style={{
              scale: "1.25",
              transform: `translateX(-5%) translateY(4%)`,
            }}
            src={
              imageSrc
                ? imageSrc.startsWith("/")
                  ? imageSrc
                  : imageSrc.replace("./", "/")
                : Imgs[currentTheme]["placeholder"].src.replace("./", "/")
            }
            alt={"placeholder"}
          />
        )}
      </div>
      <div className="absolute bottom-0 right-0 z-50 w-[250px] h-[85px] flex justify-center items-center p-4">
        <div
          className="flex justify-center items-center px-4"
          style={{
            transform: "rotate(-5deg)",
            width: "220px",
            height: "55px",
            zIndex: 50,
            position: "relative",
            bottom: "20px",
            right: "12px",
          }}
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.primary,
              color: colors[currentTheme]["primary"],
            }}
            className="text-center absolute"
            padding={{ right: 8, left: 8 }}
            maxFontSize={profileTextInfo.font.maxSize}
            minFontSize={profileTextInfo.font.minSize}
          >
            {profileText ? profileText : placeholders.profileText}
          </AutoResizeText>
        </div>
        <Image
          className={"absolute right-3 bottom-5 z-40"}
          src={Imgs[currentTheme]["artist"]}
          alt={`artist`}
          width={250}
          height={85}
        />
      </div>
    </div>
  );
};

export default ProfileImage;
