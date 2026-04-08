import TimeTableInputList from "@/components/TimeTable/FixedComponents/TimeTableInputList";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { useV2TemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import { TDefaultCard } from "@/types/time-table/data";
import { getPlaceholders } from "@/utils/time-table/data";
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
  const inputSchema = renderConfig.formSchema;

  const placeholders = useMemo(
    () =>
      getPlaceholders({
        cardInputConfig: inputSchema,
        profilePlaceholder: renderConfig.profileTextPlaceholder,
      }),
    [inputSchema, renderConfig.profileTextPlaceholder]
  );

  return (
    <TimeTableInputList
      data={data}
      onDataChange={updateData}
      globalData={globalData}
      onGlobalDataChange={updateGlobalData}
      weekdayOption={renderConfig.weekdayOption}
      cardInputConfig={inputSchema}
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
