import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import Image from "next/image";
import { PropsWithChildren } from "react";
import { Imgs } from "../_img/imgs";
import {
  colors,
  fontOption,
  profileImageStyle,
  Settings,
} from "../_settings/settings";

interface ProfileBackPlateProps {
  currentTheme?: TTheme;
}

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

const ProfileBackPlate = ({ currentTheme }: ProfileBackPlateProps) => {
  return (
    <div
      style={{
        ...Settings.backPlate,
        position: "absolute",
      }}
    >
      <Image
        src={Imgs[currentTheme || "first"]["profileBG"].src.replace("./", "/")}
        alt="profileBG"
        className="object-cover"
        draggable={false}
        fill
      />
    </div>
  );
};

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  return (
    <div
      style={{
        ...Settings.image,
        position: "absolute",
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
        ...Settings.frame,
        zIndex: profileImageStyle.arrange === "onTop" ? 10 : 20,
        position: "absolute",
      }}
    >
      <Image
        src={Imgs["first"]["profileFrame"].src.replace("./", "/")}
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
        ...Settings.text.wrapper,
        color: colors["first"]["quaternary"],
        fontFamily: fontOption.primary,
      }}
      className="absolute z-30 flex justify-start items-center "
    >
      <div
        style={{
          ...Settings.text.content,
          position: "relative",
          zIndex: 20,
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{}}
          className="text-center"
          maxFontSize={Settings.text.font.maxSize}
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
    <div
      className={`absolute flex justify-center`}
      style={{
        width: 1496,
        height: 1707,
        transform: `rotate(0deg)`,
        top: 376,
        right: 164,
      }}
      draggable={false}
    >
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
      <ProfileBackPlate />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
