import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import Image from "next/image";
import { PropsWithChildren } from "react";
import { Imgs } from "../_img/imgs";
import {
  colors,
  fontOption,
  profileImageHeight,
  profileImageStyle,
  profileImageWidth,
} from "../_settings/settings";

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

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  return (
    <div
      style={{
        width: profileImageWidth,
        height: profileImageHeight,
        position: "absolute",
        top: 80,
        left: 80,

        zIndex: profileImageStyle.arrange === "onTop" ? 20 : 10,
      }}
    >
      {imageSrc && (
        <Image
          fill
          className="object-cover"
          src={imageSrc}
          alt={"placeholder"}
        />
      )}
    </div>
  );
};

const ProfileFrame = () => {
  return (
    <div
      style={{
        zIndex: profileImageStyle.arrange === "onTop" ? 10 : 20,
        filter: "drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.8))",
      }}
      className="absolute inset-0"
    >
      <Image
        src={Imgs["first"]["profile"].src.replace("./", "/")}
        alt="frame"
        className="object-cover"
        fill
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
  if (!isProfileTextVisible) return null;
  return (
    <div
      style={{
        color: colors["first"]["primary"],
        fontFamily: fontOption.primary,
        bottom: 96,
        left: 1050,
        width: 390,
        height: 87,
      }}
      className="absolute z-30 flex justify-start items-center px-4"
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          zIndex: 20,
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{ lineHeight: 1.2 }}
          className="text-center"
          maxFontSize={40}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <Image
        src={Imgs["first"]["artist" as keyof (typeof Imgs)["first"]]}
        alt=""
        fill
      />
    </div>
  );
};

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  return (
    <div className={`absolute inset-0`} draggable={false}>
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
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
