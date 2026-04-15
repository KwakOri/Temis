import {
  useTemplateRuntimeData,
  useTemplateRuntimeUI,
} from "@/contexts/v2/template-runtime-ui-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import React from "react";

import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { isGuideEnabled } from "@/utils/time-table/data";
import { v2_getRuntimeSceneNodes } from "@/utils/v2/template-graph-runtime";
import V2SceneRenderer from "./scene-renderer";

const V2TimeTableContent: React.FC = () => {
  const { weekDates } = useTemplateRuntimeData();
  const { scale } = useTemplateRuntimeUI();
  const { renderConfig } = useTemplateRenderConfigContext();
  const runtimeSceneNodes = React.useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );

  if (weekDates.length === 0) return null;

  return (
    <div
      id="timetable"
      className=" box-border select-none font-sans origin-top-left relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
      style={{
        transform: `scale(${scale})`,
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
      }}
    >
      {isGuideEnabled && <TimeTableDesignGuide />}
      <V2SceneRenderer
        sceneNodes={runtimeSceneNodes}
      />
    </div>
  );
};

export default V2TimeTableContent;
