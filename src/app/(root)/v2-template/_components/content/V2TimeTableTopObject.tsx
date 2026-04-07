import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { Imgs } from "../../_img/imgs";
import { v2_getHighlightStyle } from "./v2_highlight";
import { v2_toRenderableStyle } from "./v2_style";

const TimeTableTopObject = () => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const {
    currentTheme,
    hoverHighlightTarget,
    activeHighlightTarget,
    isLayerHidden,
  } = useV2TimeTableEditorRuntimeContext();
  const topObjectLayout = v2_toRenderableStyle(
    renderConfig.layout.topObjectContainer
  );
  const assetUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: "topObjectByTheme",
      currentTheme,
    }) ?? Imgs.first.topObject.src;

  if (isLayerHidden("top-object")) return null;

  return (
    <div
      style={{
        ...topObjectLayout,
        position: topObjectLayout.position ?? "absolute",
        ...v2_getHighlightStyle({
          target: "topObjectContainer",
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
    >
      <img src={assetUrl} alt="top-object" draggable={false} />
    </div>
  );
};

export default TimeTableTopObject;
