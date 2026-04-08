import TimeTableInputList from "@/components/TimeTable/FixedComponents/TimeTableInputList";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { TDefaultCard } from "@/types/time-table/data";
import { getPlaceholders } from "@/utils/time-table/data";
import { v2_toLegacyCardInputConfig } from "@/utils/time-table/v2_template_render_config";
import { SizeProps } from "@/utils/utils";
import React, { useMemo } from "react";

export interface V2TimeTableInputListProps {
  containerClassName?: string;
  itemClassName?: string;
  headerClassName?: string;
  fieldsContainerClassName?: string;
  weekdayRenderer?: (day: TDefaultCard) => React.ReactNode;
  expandAnimation?: {
    duration?: number;
    maxHeight?: string;
  };
  isOfflineMemo?: boolean;
  size?: SizeProps;
}

const V2TimeTableInputList: React.FC<V2TimeTableInputListProps> = ({
  containerClassName,
  itemClassName,
  headerClassName,
  fieldsContainerClassName,
  weekdayRenderer,
  expandAnimation,
  isOfflineMemo = false,
  size = "sm",
}) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const { data, updateData, globalData, updateGlobalData } =
    useV2TimeTableEditorRuntimeContext();
  const cardInputConfig = useMemo(
    () => v2_toLegacyCardInputConfig(renderConfig.formSchema),
    [renderConfig.formSchema]
  );

  const placeholders = useMemo(
    () =>
      getPlaceholders({
        cardInputConfig,
        profilePlaceholder: renderConfig.profileTextPlaceholder,
      }),
    [cardInputConfig, renderConfig.profileTextPlaceholder]
  );

  return (
    <TimeTableInputList
      data={data}
      onDataChange={updateData}
      globalData={globalData}
      onGlobalDataChange={updateGlobalData}
      weekdayOption={renderConfig.weekdayOption}
      cardInputConfig={cardInputConfig}
      placeholders={placeholders}
      isOfflineMemo={isOfflineMemo}
      isMultiple={renderConfig.editorOptions.isMultiple}
      maxStreamingTimeByDay={renderConfig.editorOptions.maxStreamingTimeByDay}
      size={size}
      containerClassName={containerClassName}
      itemClassName={itemClassName}
      headerClassName={headerClassName}
      fieldsContainerClassName={fieldsContainerClassName}
      weekdayRenderer={weekdayRenderer}
      expandAnimation={expandAnimation}
    />
  );
};

export default V2TimeTableInputList;
