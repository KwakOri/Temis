import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { useV2TimeTableEditorRuntimeContext } from '@/contexts/v2/v2_TimeTableEditorRuntimeContext';
import { v2_getComponentFontFamily } from '@/utils/time-table/v2_template_render_config';
import { CSSProperties, PropsWithChildren } from 'react';
import { Imgs } from '../../_img/imgs';

const v2_toCssProperties = (value: unknown): CSSProperties => {
  if (!value || typeof value !== 'object') return {};
  return value as CSSProperties;
};

const v2_getArtistImageSrc = ({
  currentTheme,
  fallbackTheme,
}: {
  currentTheme: string;
  fallbackTheme: string;
}): string | null => {
  const themed = Imgs[currentTheme] as
    | Record<string, { src: string } | undefined>
    | undefined;
  const fallback = Imgs[fallbackTheme] as
    | Record<string, { src: string } | undefined>
    | undefined;

  return themed?.artist?.src ?? fallback?.artist?.src ?? null;
};

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
        position: 'absolute',
        top: profileLayout.top,
        left: profileLayout.left,
        zIndex: profileLayout.zIndex,
      }}
    >
      {imageSrc && (
        <img
          className="object-cover w-full h-full"
          src={imageSrc}
          alt="profile"
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
      key: 'profileFrameByTheme',
      currentTheme,
    }) ?? Imgs.first.profileFrame.src;

  return (
    <div
      style={{
        ...frameSize,
        zIndex: renderConfig.layout.profileFrame.zIndex,
        position: 'absolute',
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

const ProfileText = () => {
  const { profileText, isProfileTextVisible } = useTimeTableData();
  const { currentTheme } = useV2TimeTableEditorRuntimeContext();
  const { renderConfig } = useV2TemplateRenderConfigContext();

  if (!renderConfig.editorOptions.isArtist || !isProfileTextVisible) {
    return null;
  }

  const layoutRecord = renderConfig.layout as unknown as Record<string, unknown>;
  const rootStyle = v2_toCssProperties(layoutRecord.profileTextRootStyle);
  const wrapperStyle = v2_toCssProperties(layoutRecord.profileTextWrapperStyle);
  const textStyle = v2_toCssProperties(layoutRecord.profileTextStyle);
  const artistImageStyle = v2_toCssProperties(layoutRecord.profileTextArtistImageStyle);

  const artistImageSrc = v2_getArtistImageSrc({
    currentTheme,
    fallbackTheme: renderConfig.defaultTheme,
  });

  const artistText = profileText || renderConfig.profileTextPlaceholder || '';
  const artistMaxFontSize =
    renderConfig.maxFontSizes.ARTIST > 0 ? renderConfig.maxFontSizes.ARTIST : 96;

  return (
    <div
      style={{
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
        ...rootStyle,
      }}
      className="absolute z-50 flex justify-end items-center"
    >
      <div
        style={{
          position: 'absolute',
          height: 160,
          width: 400,
          zIndex: 20,
          top: 1052,
          right: 32,
          rotate: '9.6deg',
          ...wrapperStyle,
        }}
        className="flex justify-center items-center"
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: renderConfig.componentColors.ARTIST,
            fontFamily: v2_getComponentFontFamily(renderConfig, 'ARTIST'),
            fontWeight: 900,
            ...textStyle,
          }}
          className="text-center"
          maxFontSize={artistMaxFontSize}
        >
          {artistText}
        </AutoResizeText>
      </div>

      {artistImageSrc && (
        <img
          src={artistImageSrc}
          className="object-cover"
          alt="artist"
          draggable={false}
          style={artistImageStyle}
        />
      )}
    </div>
  );
};

const ProfileImageContainer = ({ children }: PropsWithChildren) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();

  return (
    <div
      className="absolute flex justify-center z-10"
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
      <ProfileText />
      <ProfileFrame />
      <ProfileImage />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
