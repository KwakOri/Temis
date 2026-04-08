import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { useV2TimeTableEditorRuntimeContext } from '@/contexts/v2/v2_TimeTableEditorRuntimeContext';
import { v2_getComponentFontFamily } from '@/utils/time-table/v2_template_render_config';
import {
  v2_findSceneTextNodeById,
  v2_resolveSceneTextNodeValue,
} from '@/utils/time-table/v2_scene_nodes';
import { PropsWithChildren } from 'react';
import { Imgs } from '../../_img/imgs';
import { v2_getHighlightStyle } from './v2_highlight';
import { v2_toRenderableStyle } from './v2_style';

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
  const { hoverHighlightTarget, activeHighlightTarget, isLayerHidden } =
    useV2TimeTableEditorRuntimeContext();
  const profileSize = renderConfig.cardSizes.profile;
  const profileLayout = v2_toRenderableStyle(renderConfig.layout.profileImage);

  if (isLayerHidden('profile-image')) return null;

  return (
    <div
      style={{
        ...profileSize,
        ...profileLayout,
        position: profileLayout.position ?? "absolute",
        ...v2_getHighlightStyle({
          target: "profileImage",
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
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
  const {
    currentTheme,
    hoverHighlightTarget,
    activeHighlightTarget,
    isLayerHidden,
  } = useV2TimeTableEditorRuntimeContext();
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const frameSize = renderConfig.cardSizes.frame;
  const frameLayout = v2_toRenderableStyle(renderConfig.layout.profileFrame);
  const frameUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: 'profileFrameByTheme',
      currentTheme,
    }) ?? Imgs.first.profileFrame.src;

  if (isLayerHidden('profile-frame')) return null;

  return (
    <div
      style={{
        ...frameSize,
        ...frameLayout,
        position: frameLayout.position ?? "absolute",
        ...v2_getHighlightStyle({
          target: "profileFrame",
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
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
  const {
    currentTheme,
    globalData,
    data,
    hoverHighlightTarget,
    activeHighlightTarget,
    isLayerHidden,
  } = useV2TimeTableEditorRuntimeContext();
  const { renderConfig } = useV2TemplateRenderConfigContext();

  if (!renderConfig.editorOptions.isArtist || !isProfileTextVisible) {
    return null;
  }
  if (isLayerHidden('profile-text')) return null;

  const sceneTextNode = v2_findSceneTextNodeById(
    renderConfig.structure.sceneNodes,
    'scene-profile-text'
  );
  const layoutRecord = renderConfig.layout as unknown as Record<string, unknown>;
  const rootStyleKey = sceneTextNode?.containerStyleKey ?? 'profileTextRootStyle';
  const wrapperStyleKey =
    sceneTextNode?.wrapperStyleKey ?? 'profileTextWrapperStyle';
  const textStyleKey = sceneTextNode?.textStyleKey ?? 'profileTextStyle';
  const rootStyle = v2_toRenderableStyle(
    layoutRecord[rootStyleKey] as Record<string, string | number>
  );
  const wrapperStyle = v2_toRenderableStyle(
    layoutRecord[wrapperStyleKey] as Record<string, string | number>
  );
  const textStyle = v2_toRenderableStyle(
    layoutRecord[textStyleKey] as Record<string, string | number>
  );
  const artistImageStyle = v2_toRenderableStyle(
    layoutRecord.profileTextArtistImageStyle
  );

  const artistImageSrc = v2_getArtistImageSrc({
    currentTheme,
    fallbackTheme: renderConfig.defaultTheme,
  });

  const fallbackArtistText = profileText || renderConfig.profileTextPlaceholder || '';
  const firstCard = data[0] as Record<string, unknown> | undefined;
  const firstEntry = (firstCard?.entries as Record<string, unknown>[] | undefined)?.[0];
  const artistText = sceneTextNode
    ? v2_resolveSceneTextNodeValue({
        node: sceneTextNode,
        fallbackValue: fallbackArtistText,
        computedValues: {
          streamingDate: fallbackArtistText,
          streamingDay: fallbackArtistText,
          streamingTime: fallbackArtistText,
        },
        entrySource: firstEntry,
        cardSource: firstCard,
        globalSource: globalData as Record<string, unknown>,
      })
    : fallbackArtistText;
  const artistMaxFontSize =
    renderConfig.maxFontSizes.ARTIST > 0 ? renderConfig.maxFontSizes.ARTIST : 96;
  const artistColorKey = sceneTextNode?.colorKey ?? 'ARTIST';
  const artistFontKey = sceneTextNode?.fontKey ?? 'ARTIST';
  const profileTextContainerClassName =
    sceneTextNode?.containerClassName ?? 'absolute z-50 flex justify-end items-center';
  const profileTextClassName = sceneTextNode?.textClassName ?? 'text-center';

  return (
    <div
      style={{
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
        ...rootStyle,
        ...v2_getHighlightStyle({
          target: sceneTextNode?.highlightTarget ?? 'profileText',
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
      className={profileTextContainerClassName}
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
            color: renderConfig.componentColors[artistColorKey],
            fontFamily: v2_getComponentFontFamily(renderConfig, artistFontKey),
            fontWeight: 900,
            ...textStyle,
          }}
          className={profileTextClassName}
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
  const layoutRecord = renderConfig.layout as unknown as Record<string, unknown>;
  const profileTextRootStyle =
    (layoutRecord.profileTextRootStyle as Record<string, unknown> | undefined) ??
    undefined;
  const zCandidates = [
    renderConfig.layout.profileImage?.zIndex,
    renderConfig.layout.profileFrame?.zIndex,
    profileTextRootStyle?.zIndex,
  ]
    .map((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      return undefined;
    })
    .filter((value): value is number => value !== undefined);
  const containerZIndex =
    zCandidates.length > 0 ? Math.max(...zCandidates) : undefined;

  return (
    <div
      className="absolute flex justify-center"
      style={{
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
        ...(containerZIndex !== undefined ? { zIndex: containerZIndex } : {}),
      }}
      draggable={false}
    >
      {children}
    </div>
  );
};

const ProfileImageSection = () => {
  const { isLayerHidden } = useV2TimeTableEditorRuntimeContext();
  if (isLayerHidden('profile')) return null;

  return (
    <ProfileImageContainer>
      <ProfileText />
      <ProfileFrame />
      <ProfileImage />
    </ProfileImageContainer>
  );
};

export default ProfileImageSection;
