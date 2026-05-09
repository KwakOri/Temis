import { CSSProperties } from "react";

import {
  V2TemplateRenderConfig,
  V2TemplateSceneAssetNode,
  V2TemplateSceneAssetRole,
} from "@/types/time-table/template-render-config";

export const v2_resolveSceneAssetRole = (
  node: Pick<V2TemplateSceneAssetNode, "id" | "layerId" | "assetRole">
): V2TemplateSceneAssetRole => {
  if (node.assetRole) return node.assetRole;
  if (node.layerId === "profile-image") return "profileImage";
  if (node.layerId === "profile-frame") return "profileFrame";
  if (node.layerId === "frame-artwork") return "frameArtwork";
  if (node.layerId === "frame-frame") return "frameObject";
  if (node.id === "scene-background") return "background";
  if (node.id === "scene-guide-overlay") return "guideOverlay";
  return "general";
};

export interface V2ResolvedRuntimeAssetModel {
  assetRole: V2TemplateSceneAssetRole;
  assetUrl: string | null;
  isFrameArtwork: boolean;
  isProfileImage: boolean;
  baseStyle: CSSProperties;
  fit: CSSProperties["objectFit"];
}

export const v2_resolveRuntimeAssetModel = ({
  node,
  renderConfig,
  configuredAssetUrl,
  imageSrc,
}: {
  node: V2TemplateSceneAssetNode;
  renderConfig: V2TemplateRenderConfig;
  configuredAssetUrl: string | null;
  imageSrc: string | null;
}): V2ResolvedRuntimeAssetModel => {
  const assetRole = v2_resolveSceneAssetRole(node);
  const isFrameArtwork = assetRole === "frameArtwork" || assetRole === "profileImage";
  const isFrameObject = assetRole === "frameObject" || assetRole === "profileFrame";
  const isBackground = assetRole === "background";
  const isGuideOverlay = assetRole === "guideOverlay";

  const uploadedProfileImage =
    isFrameArtwork && typeof imageSrc === "string" && imageSrc.trim()
      ? imageSrc
      : null;
  const assetUrl = isFrameArtwork ? uploadedProfileImage : configuredAssetUrl;

  const baseStyle: CSSProperties = isBackground
    ? {
        position: "absolute",
        inset: 0,
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
      }
    : isGuideOverlay
      ? {
          position: "absolute",
          inset: 0,
          width: renderConfig.templateSize.width,
          height: renderConfig.templateSize.height,
          pointerEvents: "none",
        }
      : isFrameArtwork
        ? {
            ...renderConfig.cardSizes.profile,
            position: "absolute",
          }
        : isFrameObject
          ? {
              ...renderConfig.cardSizes.frame,
              position: "absolute",
            }
          : {
              position: "absolute",
            };

  return {
    assetRole,
    assetUrl,
    isFrameArtwork,
    isProfileImage: isFrameArtwork,
    baseStyle,
    fit: node.fit ?? "cover",
  };
};
