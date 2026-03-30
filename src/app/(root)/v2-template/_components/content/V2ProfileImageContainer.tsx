import { PropsWithChildren } from "react";
import { useTimeTableData } from "@/contexts/TimeTableContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { Imgs } from "../../_img/imgs";

const ProfileImage = () => {
  const { imageSrc } = useTimeTableData();
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const profileSize = renderConfig.cardSizes.profile;
  const profileLayout = renderConfig.layout.profileImage;

  return (
    <div
      style={{
        ...profileSize,
        rotate: `${profileLayout.rotateDeg}deg`,
        position: "absolute",
        top: profileLayout.top,
        left: profileLayout.left,
        zIndex: profileLayout.zIndex,
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
  const { currentTheme } = useV2TimeTableEditorRuntimeContext();
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const frameSize = renderConfig.cardSizes.frame;
  const frameUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: "profileFrameByTheme",
      currentTheme,
    }) ?? Imgs.first.profileFrame.src;

  return (
    <div
      style={{
        ...frameSize,
        zIndex: renderConfig.layout.profileFrame.zIndex,
        position: "absolute",
      }}
    >
      <img
        src={frameUrl}
        alt="frame"
        className="object-cover"
        draggable={false}
      />
    </div>
  );
};

// const ProfileText = ({
//   profileText,
//   profileTextPlaceholder,
//   isProfileTextVisible,
// }: ProfileTextProps) => {
//   if (!isProfileTextVisible) return null;
//   return (
//     <div
//       style={{
//         width: 4000,
//         height: 2250,
//       }}
//       className="absolute z-50 flex justify-end items-center "
//     >
//       <div
//         style={{
//           position: "absolute",
//           height: 160,
//           width: 400,
//           zIndex: 20,
//           top: 1052,
//           right: 32,
//           rotate: "9.6deg",
//         }}
//         className="flex justify-center items-center "
//       >
//         <AutoResizeText
//           style={{
//             lineHeight: 1,
//             color: COMP_COLORS.ARTIST,
//             fontFamily: COMP_FONTS.ARTIST,
//             fontWeight: 900,
//           }}
//           className="text-center"
//           maxFontSize={MAX_FONT_SIZES.ARTIST}
//         >
//           {profileText ? profileText : profileTextPlaceholder}
//         </AutoResizeText>
//       </div>
//       <img
//         src={Imgs["first"]["artist"].src}
//         className="object-cover"
//         alt="artist"
//       />
//     </div>
//   );
// };

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();

  return (
    <div
      className={`absolute flex justify-center z-10`}
      style={{
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
      }}
      draggable={false}
    >
      {children}
    </div>
  );
};

const ProfileImageSection = () => {
  return (
    <ProfileImageContainer>
      {/* <ProfileText
        isProfileTextVisible={isProfileTextVisible}
        profileText={profileText}
        profileTextPlaceholder={profileTextPlaceholder}
      /> */}
      <ProfileFrame />
      <ProfileImage />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
