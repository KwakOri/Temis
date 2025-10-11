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

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  return (
    <div
      style={{
        width: Settings.profile.image.width,
        height: Settings.profile.image.height,
        position: "absolute",
        top: 516,
        left: 2400,
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
          width: Settings.profile.artist.width,
          height: Settings.profile.artist.height,
          left: 4,
        }}
        className="absolute z-30 flex justify-start items-center"
      >
        <div
          style={{
            position: "absolute",
            width: 1318,
            height: 160,
            color: Settings.profile.artist.fontColor,
            fontFamily: fontOption.primary,
            bottom: 268,
            right: 200,
            rotate: "1.6deg",
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
          className="object-cover pointer-events-none"
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
        profileText={profileText}
        profileTextPlaceholder={profileTextPlaceholder}
      />
      <ProfileFrame />
      <ProfileImage imageSrc={imageSrc} />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
