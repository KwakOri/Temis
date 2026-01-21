import React, { CSSProperties, PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { weekdays } from "@/utils/time-table/data";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import { COMP_COLORS, COMP_FONTS, weekdayOption } from "../_settings/settings";

type TCARD = "A" | "B" | "C" | "D";

const CARD_ORDERS: TCARD[] = ["B", "C", "C", "A", "A", "D", "D"];
const CARD_ANGLES: number[] = [-0,0,0,0,0,0,0];
const CARD_POSITIONS: CSSProperties[] = [
  { top: 0, left: -0 },
  { top: 0, left: 0 },
  { top: 0, left: 0 },
  { top: 0, left: 0 },
  { top: 0, left: 0 },
  { top: 0, left: 0 },
  { top: 0, left: 0 },
];

const cardSizes: {
  A: CSSProperties;
  B: CSSProperties;
  C: CSSProperties;
  D: CSSProperties;
} = {
  A: {
    width: 800,
    height: 1080,
  },
  B: {
    width: 1320,
    height: 900,
  },
  C: {
    width: 1320,
    height: 900,
  },
  D: {
    width: 1080,
    height: 600,
  },
};

interface CardStreamingDayProps {
  currentTheme?: TTheme;
  day: number;
}

interface CardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
}

interface CardStreamingDateProps {
  date: number;
  currentTheme?: TTheme;
}

interface CardMainTitleProps {
  currentTheme?: TTheme;
  content: string;
  day: number;
}

interface CardSubTitleProps {
  content: string | null;
  day: number;
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

interface CardStreamingDayAndTimeProps {
  time: string;
  currentTheme?: TTheme;
  isGuerrilla: boolean;
  day: number;
}



const CardStreamingDay = ({ currentTheme, day }: CardStreamingDayProps) => {
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: COMP_COLORS.STREAMING_DAY,
        fontSize: 64,
        height: 80,
        width: 300,
        top: 48,
      }}
      className="absolute flex justify-center items-center"
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const CardStreamingDate = ({ date, currentTheme }: CardStreamingDateProps) => {
  return (
    <p
      style={{
        color: COMP_COLORS.STREAMING_DATE,
        fontFamily:COMP_FONTS.STREAMING_DATE,
        width: "100%",
        height: 80,
        lineHeight: 1,
        fontWeight: 400,
        letterSpacing: -4,
      }}
      className=" flex justify-center items-center text-[80px] font-bold "
    >
      {date}
    </p>
  );
};

const CardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        width: 360,
        height: 72,
        lineHeight: 1,
        fontSize: 64,
        top: 460,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}
    </p>
  );
};

const CardMainTitle = ({
  currentTheme,
  content,
  day,
}: CardMainTitleProps) => {
  const cardType = CARD_ORDERS[day];
  return (
    <div
          style={{
            height: 320,
            width: 640,
            top: 380,
            marginRight: 20,
          }}
          className="absolute flex justify-center items-center shrink-0"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.MAIN_TITLE,
              color: COMP_COLORS.MAIN_TITLE,
              fontWeight: 900,
              lineHeight: 1.25,
            }}
            className="leading-none text-center"
            multiline={true}
            maxFontSize={120}
          >
            {content ? (content as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  const cardType = CARD_ORDERS[day];
  return (
    
    <div
    style={{
      width: 600,
      height: 200,
      top: 744,
    }}
    className="absolute flex justify-center items-center"
  >
    <AutoResizeText
      style={{
        fontFamily: COMP_FONTS.SUB_TITLE,
        color: COMP_COLORS.SUB_TITLE,
        fontWeight: 900,
      }}
      className="leading-none text-center w-full"
      maxFontSize={72}
      multiline
    >
      {content ? (content as string) : placeholders.subTitle}
    </AutoResizeText>
  </div>
  );
};

interface OnlineCardBGProps {
  day: number;
}

const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        ...cardSizes[CARD_ORDERS[day]],
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"]["online" + CARD_ORDERS[day]].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  return (
    <div
      style={{
        ...cardSizes[CARD_ORDERS[day]],
      }}
      key={day}
    >
      <img
        src={Imgs[currentTheme || "first"][
          "offline" + CARD_ORDERS[day]
        ].src.replace("./", "/")}
        alt="offline"
        style={{
          ...cardSizes[CARD_ORDERS[day]],
        }}
      />
    </div>
  );
};

const CellContentArea = ({ children }: PropsWithChildren) => {
  return (
    <div
      style={{
        width: 612,
        height: 528,
        top: 30,
      }}
      className="absolute w-full h-full flex flex-col items-center ml-4"
    >
      {children}
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  if (!weekDate) return "Loading";

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";

  return (
    <div
      style={{
        position: "absolute",
        rotate: CARD_ANGLES[time.day] + "deg",
        ...CARD_POSITIONS[time.day],
      }}
    >
      {time.isOffline ? (
        <OfflineCard day={time.day} />
      ) : (
        <div
          style={{ ...cardSizes[CARD_ORDERS[time.day]] }}
          key={time.day}
          className="relative flex justify-center "
        >
          {/* <StreamingDay day={time.day} /> */}
          <CardMainTitle content={entryMainTitle} day={time.day} />
          <CardSubTitle content={entrySubTitle} day={time.day} />
          

          <OnlineCardBG day={time.day} />
        </div>
      )}
    </div>
  );
};

export default TimeTableCell;
