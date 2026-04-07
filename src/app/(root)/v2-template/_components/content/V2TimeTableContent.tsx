import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from "@/contexts/v2/v2_TemplateRenderConfigContext";
import React from "react";

import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { isGuideEnabled } from "@/utils/time-table/data";
import { Imgs } from "../../_img/imgs";
import V2SceneRenderer from "./V2SceneRenderer";

const V2TimeTableContent: React.FC = () => {
  const { currentTheme } = useV2TimeTableEditorRuntimeContext();
  const { weekDates } = useTimeTableData();
  const { scale } = useTimeTableUI();
  const { renderConfig } = useV2TemplateRenderConfigContext();

  if (weekDates.length === 0) return null;

  const backgroundImage =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: "bgByTheme",
      currentTheme,
    }) ?? Imgs[currentTheme]?.bg?.src ?? Imgs.first.bg.src;

  return (
    <div
      id="timetable"
      className=" box-border select-none font-sans origin-top-left relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
      style={{
        transform: `scale(${scale})`,
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
      }}
    >
      {isGuideEnabled && <TimeTableDesignGuide />}
      <V2SceneRenderer layers={renderConfig.structure.layers} />
    </div>
  );
};

export default V2TimeTableContent;
