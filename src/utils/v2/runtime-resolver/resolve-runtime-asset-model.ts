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
  if (node.id === "scene-background") return "background";
  if (node.id === "scene-guide-overlay") return "guideOverlay";
  return "general";
};

export interface V2ResolvedRuntimeAssetModel {
  assetRole: V2TemplateSceneAssetRole;
  assetUrl: string | null;
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
  const isProfileImage = assetRole === "profileImage";
  const isProfileFrame = assetRole === "profileFrame";
  const isBackground = assetRole === "background";
  const isGuideOverlay = assetRole === "guideOverlay";

  const uploadedProfileImage =
    isProfileImage && typeof imageSrc === "string" && imageSrc.trim()
      ? imageSrc
      : null;
  const assetUrl = isProfileImage ? uploadedProfileImage : configuredAssetUrl;

  const baseStyle: CSSProperties = isBackground
    ? {
        position: "absolute",
        inset: 0,
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
        zIndex: 0,
      }
    : isGuideOverlay
      ? {
          position: "absolute",
          inset: 0,
          width: renderConfig.templateSize.width,
          height: renderConfig.templateSize.height,
          zIndex: 999,
          pointerEvents: "none",
        }
      : isProfileImage
        ? {
            ...renderConfig.cardSizes.profile,
            position: "absolute",
          }
        : isProfileFrame
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
    isProfileImage,
    baseStyle,
    fit: node.fit ?? "cover",
  };
};
