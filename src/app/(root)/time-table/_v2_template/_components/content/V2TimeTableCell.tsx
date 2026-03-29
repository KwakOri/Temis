import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { padZero } from "@/utils/date-formatter";
import { formatTime } from "@/utils/time-formatter";
import { createPlaceholdersFromConfig } from "@/utils/time-table/data";
import { v2_getComponentFontFamily } from "@/utils/time-table/v2_template_render_config";
import { Imgs } from "../../_img/imgs";

// type TCARD = "A" | "B" | "C" | "D";

// const CARD_ORDERS: TCARD[] = ["B", "C", "C", "A", "A", "D", "D"];
// const CARD_ANGLES: number[] = [-0,0,0,0,0,0,0];
// const CARD_POSITIONS: CSSProperties[] = [
//   { top: 0, left: -0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
// ];

// const cardSizes: {
//   A: CSSProperties;
//   B: CSSProperties;
//   C: CSSProperties;
//   D: CSSProperties;
// } = {
//   A: {
//     width: 800,
//     height: 1080,
//   },
//   B: {
//     width: 1320,
//     height: 900,
//   },
//   C: {
//     width: 1320,
//     height: 900,
//   },
//   D: {
//     width: 1080,
//     height: 600,
//   },
// };

interface CardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
}

interface CardStreamingDateProps {
  date: number;
}

interface CardMainTitleProps {
  content: string;
}

interface CardSubTitleProps {
  content: string | null;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  day: number;
  currentTheme?: TTheme;
}

const CardStreamingDate = ({ date }: CardStreamingDateProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const streamingDateLayout = renderConfig.layout.cell.streamingDate;

  return (
    <p
      style={{
        color: renderConfig.componentColors.STREAMING_DATE,
        fontFamily: v2_getComponentFontFamily(renderConfig, "STREAMING_DATE"),
        width: streamingDateLayout.width,
        height: streamingDateLayout.height,
        lineHeight: streamingDateLayout.lineHeight,
        fontSize: streamingDateLayout.fontSize,
        fontWeight: streamingDateLayout.fontWeight,
        letterSpacing: streamingDateLayout.letterSpacing,
        marginTop: streamingDateLayout.marginTop,
      }}
      className=" flex justify-center items-center"
    >
      {padZero(date)}
    </p>
  );
};

const CardStreamingTime = ({
  time,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const streamingTimeLayout = renderConfig.layout.cell.streamingTime;

  return (
    <p
      style={{
        fontFamily: v2_getComponentFontFamily(renderConfig, "STREAMING_TIME"),
        color: renderConfig.componentColors.STREAMING_TIME,
        width: streamingTimeLayout.width,
        height: streamingTimeLayout.height,
        lineHeight: streamingTimeLayout.lineHeight,
        fontSize: streamingTimeLayout.fontSize,
        top: streamingTimeLayout.top,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}
    </p>
  );
};

const CardMainTitle = ({ content }: CardMainTitleProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const mainTitleLayout = renderConfig.layout.cell.mainTitleContainer;
  const placeholders = createPlaceholdersFromConfig({
    cardInputConfig: renderConfig.cardInputConfig,
  });

  return (
    <div
      style={{
        height: mainTitleLayout.height,
        width: `${mainTitleLayout.widthPercent}%`,
        top: mainTitleLayout.top,

      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: v2_getComponentFontFamily(renderConfig, "MAIN_TITLE"),
          color: renderConfig.componentColors.MAIN_TITLE,
          letterSpacing: -2,
          fontWeight: 600,
          lineHeight: 1.2,
        }}
        className="leading-none text-center"
        multiline={true}
        maxFontSize={renderConfig.maxFontSizes.MAIN_TITLE}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content }: CardSubTitleProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const subTitleLayout = renderConfig.layout.cell.subTitleContainer;
  const placeholders = createPlaceholdersFromConfig({
    cardInputConfig: renderConfig.cardInputConfig,
  });

  return (

    <div
      style={{
        width: `${subTitleLayout.widthPercent}%`,
        height: subTitleLayout.height,
        top: subTitleLayout.top

      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: v2_getComponentFontFamily(renderConfig, "SUB_TITLE"),
          color: renderConfig.componentColors.SUB_TITLE,
          fontWeight: 500,
          letterSpacing: -2,
        }}
        className="leading-none text-center w-full"
        maxFontSize={renderConfig.maxFontSizes.SUB_TITLE}
        multiline
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  currentTheme?: TTheme;
}

const OnlineCardBG = ({ currentTheme }: OnlineCardBGProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const cardSize = renderConfig.cardSizes.online;
  const onlineUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: "onlineByTheme",
      currentTheme: currentTheme || renderConfig.defaultTheme,
    }) ?? Imgs[currentTheme || "first"]?.online?.src ?? Imgs.first.online.src;

  return (
    <div
      style={{
        ...cardSize,
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={onlineUrl}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const cardSize = renderConfig.cardSizes.offline;
  const offlineUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: "offlineByTheme",
      currentTheme: currentTheme || renderConfig.defaultTheme,
    }) ?? Imgs[currentTheme || "first"]?.offline?.src ?? Imgs.first.offline.src;

  return (
    <div
      style={{
        ...cardSize,
      }}
      key={day}
    >
      <img
        src={offlineUrl}
        alt="offline"
        style={{
          ...cardSize,
        }}
      />
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const cardSize = renderConfig.cardSizes.online;

  if (!weekDate) return "Loading";

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";

  return (
    <>
      {time.isOffline ? (
        <OfflineCard day={time.day} currentTheme={currentTheme} />
      ) : (
        <div
          style={{ ...cardSize }}
          key={time.day}
          className="relative flex justify-center"
        >

          <CardStreamingDate date={weekDate.getDate()} />
          <CardSubTitle content={entrySubTitle} />
          <CardMainTitle content={entryMainTitle} />
          <CardStreamingTime
            isGuerrilla={Boolean(primaryEntry.isGuerrilla)}
            time={entryTime}
          />

          <OnlineCardBG currentTheme={currentTheme} />
        </div>
      )}
    </>
  );
};

export default TimeTableCell;
