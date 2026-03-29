import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from "@/contexts/v2/v2_TemplateRenderConfigContext";
import React from "react";

import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { isGuideEnabled } from "@/utils/time-table/data";
import { Imgs } from "../../_img/imgs";
import V2ProfileImageSection from "./V2ProfileImageContainer";
import V2TimeTableGrid from "./V2TimeTableGrid";
import V2TimeTableTopObject from "./V2TimeTableTopObject";
import V2TimeTableWeekFlag from "./V2TimeTableWeekFlag";

export interface TimeTableContentProps {
  currentTheme: TTheme;
  data: TDefaultCard[];
}

const TimeTableContent: React.FC<TimeTableContentProps> = ({
  currentTheme,
  data,
}) => {
  const { imageSrc, weekDates } = useTimeTableData();
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
      <V2TimeTableTopObject />
      <V2TimeTableWeekFlag weekDates={weekDates} />
      <V2TimeTableGrid
        data={data}
        weekDates={weekDates}
        currentTheme={currentTheme}
      />
      <V2ProfileImageSection
        imageSrc={imageSrc}
        currentTheme={currentTheme}
      />
    </div>
  );
};

export default TimeTableContent;
