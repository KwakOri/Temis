import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";

import { AutoResizeText } from "@/components/AutoResizeTextCard";
import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { TDynamicCard, TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { isGuideEnabled } from "@/utils/time-table/data";
import { Imgs } from "../../_img/imgs";
import { colors, fontOption, templateSize } from "../../_settings/settings";

export interface TimeTableContentProps {
  currentTheme: TTheme;
  data: TDynamicCard;
  placeholders: TPlaceholders;
}

const TimeTableContent: React.FC<TimeTableContentProps> = ({
  currentTheme,
  data,
  placeholders,
}) => {
  const { imageSrc, weekDates, profileText } = useTimeTableData();
  const { scale, isProfileTextVisible } = useTimeTableUI();
  const info = data.entries?.[0];
  const [year, month, date] = info?.date?.toString().split("-") || ["", "", ""];
  const asmrType = data.entries[0].category as "3DIO" | "YETI" | "none";
  console.log(asmrType);

  if (weekDates.length === 0) return null;

  return (
    <div
      id="timetable"
      className=" box-border select-none font-sans origin-top-left relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
      style={{
        transform: `scale(${scale})`,
        width: templateSize.width,
        height: templateSize.height,
      }}
    >
      {isGuideEnabled && <TimeTableDesignGuide />}
      <div className="absolute inset-0 z-40">
        {asmrType !== "none" && (
          <div
            className="absolute "
            style={{ width: 270, height: 148, top: 16, right: 44 }}
          >
            <img
              className="object-cover w-full h-full pointer-events-none"
              src={Imgs["first"][asmrType === "3DIO" ? "threeDio" : "yeti"].src}
              alt=""
            />
          </div>
        )}
        <p
          className="absolute flex justify-center items-center"
          style={{
            top: 26,
            left: 68,
            width: 280,
            height: 74,
            fontSize: 33,
            fontFamily: fontOption.primary,
            fontWeight: 700,
            color: colors["first"]["primary"],
          }}
        >
          {month}/{date}일 다시보기
        </p>
        <div
          style={{
            width: 540,
            height: 400,
            top: 228 - (info.mainTitleY as number),
            right: 0 - (info.mainTitleX as number),
            rotate: "8deg",
          }}
          className="absolute flex justify-center items-center"
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.secondary,

              color: colors["first"]["secondary"],
              textShadow: `
              0 0 6px #4BC6E2,
              0 0 12px #4BC6E2,
              0 0 24px #4BC6E2,
              0 0 48px #4BC6E2
            `,
              textAlign: "center",
              lineHeight: 1.2,
            }}
            multiline={true}
            maxFontSize={100}
          >
            {info?.mainTitle}
          </AutoResizeText>
        </div>
        <div
          style={{
            width: 540,
            height: 100,
            top: 592,
            right: 12,
            rotate: "8deg",
          }}
          className="absolute flex justify-center items-center"
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.secondary,
              color: colors["first"]["secondary"],
              textShadow: `
              0 0 6px #4BC6E2,
              0 0 12px #4BC6E2,
              0 0 24px #4BC6E2,
              0 0 48px #4BC6E2
            `,
              textAlign: "center",
              lineHeight: 1.2,
            }}
            multiline={true}
            maxFontSize={48}
          >
            {info?.tags as string}
          </AutoResizeText>
        </div>
      </div>
      <div className="absolute inset-0 z-30">
        <img
          className="object-cover w-full h-full pointer-events-none"
          src={Imgs["first"]["frame"].src}
          alt=""
        />
      </div>
      <div className="absolute inset-0 z-20">
        {imageSrc && (
          <img
            className="object-cover w-full h-full pointer-events-none"
            src={imageSrc}
            alt=""
          />
        )}
      </div>
    </div>
  );
};

export default TimeTableContent;
