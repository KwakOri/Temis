import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import { PropsWithChildren } from "react";
import { Imgs } from "../_img/imgs";
import { fontOption, Settings } from "../_settings/settings";

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
        zIndex: "0",
      }}
      className="absolute inset-0"
    >
      <img
        src={Imgs[currentTheme || "first"]["profileBG"].src.replace("./", "/")}
        alt="profileBG"
        className="object-cover w-full h-full"
        draggable={false}
      />
    </div>
  );
};

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  return (
    <div
      style={{
        width: Settings.profile.image.width,
        height: Settings.profile.image.height,
        position: "absolute",
        top: 0,
        right: 120,
        zIndex: 10,
      }}
    >
      {imageSrc && (
        <img
          className="object-cover w-full h-full"
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
        width: Settings.profile.frame.width,
        height: Settings.profile.frame.height,
        zIndex: 20,
        position: "absolute",
      }}
    >
      <img
        src={Imgs["first"]["profileFrame"].src.replace("./", "/")}
        alt="frame"
        className="object-cover"
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
    <>
      <div
        style={{
          color: Settings.profile.artist.fontColor,
          fontFamily: fontOption.primary,
          width: Settings.profile.artist.width,
          height: Settings.profile.artist.height,
          bottom: -12,
          right: 22,
        }}
        className="absolute z-30 flex justify-start items-center"
      >
        <div
          style={{
            position: "absolute",
            top: 172,
            left: 90,
            width: 480,
            height: 160,
          }}
          className="flex justify-center items-center"
        >
          <AutoResizeText
            className="text-center"
            maxFontSize={Settings.profile.artist.fontSize}
          >
            {profileText ? profileText : profileTextPlaceholder}
          </AutoResizeText>
        </div>
        <img
          src={Imgs["first"]["artist"].src}
          alt="artist"
          className="object-cover"
        />
      </div>
    </>
  );
};

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={`absolute flex justify-center z-10`}
      style={{
        width: 4000,
        height: 2250,
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
        isProfileTextVisible={isProfileTextVisible}
        profileTextPlaceholder={profileTextPlaceholder}
        profileText={profileText}
      />

      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
