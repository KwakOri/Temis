import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { Imgs } from "../_img/imgs";

const TimeTableTopObject = () => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const topObjectLayout = renderConfig.layout.topObjectContainer;
  const assetUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: "topObjectByTheme",
      currentTheme: renderConfig.defaultTheme,
    }) ?? Imgs.first.topObject.src;

  return (
    <div
      style={{
        width: topObjectLayout.width,
        height: topObjectLayout.height,
        position: "absolute",
        zIndex: topObjectLayout.zIndex,
      }}
    >
      <img src={assetUrl} alt="top-object" draggable={false} />
    </div>
  );
};

export default TimeTableTopObject;
