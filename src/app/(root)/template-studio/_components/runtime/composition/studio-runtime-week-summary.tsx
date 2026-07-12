import React from "react";

import { StudioRuntimeSettingRow } from "./studio-runtime-setting-row";

interface StudioRuntimeWeekSummaryProps {
  startDate?: string;
  endDate?: string;
}

const formatWeekValue = (startDate?: string, endDate?: string) => {
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  return startDate ?? endDate ?? "Not set";
};

export function StudioRuntimeWeekSummary({
  startDate,
  endDate,
}: StudioRuntimeWeekSummaryProps) {
  return (
    <StudioRuntimeSettingRow
      control={
        <span className="text-right text-xs font-extrabold text-[var(--runtime-fg)]">
          {formatWeekValue(startDate, endDate)}
        </span>
      }
      description="Defined by the saved template"
      label="Week"
    />
  );
}
