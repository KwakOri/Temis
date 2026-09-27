import React, { CSSProperties } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard, TEntry } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { padZero } from "@/utils/date-formatter";
import { formatTime } from "@/utils/time-formatter";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import {
  BASE_COLORS,
  BASE_FONTS,
  CARD_SIZES,
  cardSize,
  COMP_COLORS,
  COMP_FONTS,
  getCardType,
} from "../_settings/settings";
import { createTextStroke } from "@/utils/utils";

interface CardStreamingDayProps {
  currentTheme?: TTheme;
  isOffline: boolean;
  day: number;
}

interface CardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
}

interface CardStreamingDateProps {
  day: number;
  date: Date;
  currentTheme?: TTheme;
  isOffline: boolean;
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

interface CardOfflineMemoProps {
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

interface MultiCardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;

  currentTheme?: TTheme;
}

interface MultiCardMainTitleProps {
  currentTheme?: TTheme;
  content: string;
}

interface MultiCardSubTitleProps {
  content: string | null;
}

const MultiCardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: MultiCardStreamingTimeProps) => {
  const koTime = { AM: "오전", PM: "오후" };
  const [prefix, suffix] = formatTime(time, "half").split(" ");
  const koPrefix = koTime[prefix as keyof typeof koTime];

  return (
    <div
      style={{
        height: 80,
        width: 370,
        top: 6,
        left: 280,
      }}
      className=" absolute flex justify-center items-center"
    >
      <p
        className="relative z-10"
        style={{
          fontSize: 40,
          fontFamily: COMP_FONTS.STREAMING_TIME,
          color: BASE_COLORS.first.primary,
        }}
      >
        {isGuerrilla ? "게릴라" : `${koPrefix} ${suffix}`}
      </p>
    </div>
  );
};

const MultiCardMainTitle = ({
  currentTheme,
  content,
}: MultiCardMainTitleProps) => {
  return (
    <div
      style={{
        height: 80,
        width: 370,
        top: 94,
        left: 280,
      }}
      className="absolute flex justify-center items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          letterSpacing: 1,
        }}
        className="leading-none text-center"
        maxFontSize={40}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const MultiCardSubTitle = ({ content }: MultiCardSubTitleProps) => {
  return (
    <div
      style={{
        height: 40,
        width: 492,
        top: 147,
        left: 28,
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
        }}
        className="leading-none text-left w-full"
        maxFontSize={20}
        multiline
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

const MultiCard = ({ day }: { day: number }) => {
  const isOdd = day % 2 === 1;
  const cardName = isOdd ? "multi_a" : "multi_b";
  return (
    <div
      style={{
        ...CARD_SIZES.ONLINE,
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"][cardName].src.replace("./", "/")}
        alt="multi"
        style={{
          ...CARD_SIZES.ONLINE,
        }}
      />
    </div>
  );
};

interface EntryCardProps {
  style?: CSSProperties;
  entry: TEntry;
}

const EntryCard = ({ entry, style }: EntryCardProps) => {
  return (
    <div
      className="absolute"
      style={{ width: 664, left: 86, height: 180, ...style }}
    >
      <MultiCardMainTitle content={entry.mainTitle as string} />
      {/* <MultiCardSubTitle content={entry.subTitle as string} /> */}
      <MultiCardStreamingTime
        isGuerrilla={entry.isGuerrilla}
        time={entry.time}
      />
    </div>
  );
};

const CardStreamingDay = ({
  currentTheme,
  day,
  isOffline,
}: CardStreamingDayProps) => {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return (
    <>
      <p
        style={{
          width: 240,
          height: 80,
          top: 84,
          left: 86,
          fontSize: getCardType(day) === "a" ? 130 : 115,
          fontFamily: COMP_FONTS.STREAMING_DAY,
          fontWeight: 700,
          color: isOffline ? "#6873FA" : "#FC4284",
          rotate: "-11deg",
          ...createTextStroke({
            color: "#ffffff",
            width: 16,
          }),
          paintOrder: "stroke fill",
        }}
        className="absolute flex justify-center items-center"
      >
        {days[day].toLocaleUpperCase()}
      </p>
    </>
  );
};

const CardStreamingDate = ({
  day,
  date,
  currentTheme,
  isOffline,
}: CardStreamingDateProps) => {
  return (
    <p
      style={{
        width: 200,
        height: 64,
        top: 52,
        left: 440,
        fontSize: 50,
        fontFamily: COMP_FONTS.STREAMING_DATE,

        color: "#4A628C",
      }}
      className=" absolute flex justify-center items-center"
    >
      {padZero(date.getMonth() + 1)}.{padZero(date.getDate())}
    </p>
  );
};

const CardStreamingTime = ({
  day,
  time,
  currentTheme,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: "#ffffff",
        width: 300,
        height: 72,
        lineHeight: 1,
        fontSize: getCardType(day) === "a" ? 50 : 42,
        fontWeight: 700,
        top: getCardType(day) === "a" ? 600 : 578,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: getCardType(day) === "a" ? 260 : 220,
        width: getCardType(day) === "a" ? 700 : 500,
        top: getCardType(day) === "a" ? 314 : 320,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          fontWeight: 700,
          color: "#882449",
          lineHeight: 1.05,
        }}
        className="leading-none text-center"
        maxFontSize={getCardType(day) === "a" ? 110 : 95}
        multiline
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  return (
    <div
      style={{
        width: getCardType(day) === "a" ? 700 : 500,
        height: 80,
        top: 244,
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          fontWeight: 700,
          color: "#FC4284",
        }}
        className="leading-none text-center w-full"
        maxFontSize={50}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

// const CardOfflineMemo = ({ content, day }: CardOfflineMemoProps) => {
//   return (
//     <div
//       style={{
//         width: 900,
//         height: 80,
//         top: 88,
//         left: 1152,
//       }}
//       className="absolute flex justify-start items-center"
//     >
//       <AutoResizeText
//         style={{
//           fontFamily: COMP_FONTS.SUB_TITLE,
//           color: '#B0C2AB',
//           fontWeight: 700,
//         }}
//         className="leading-none text-left w-full"
//         maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
//       >
//         {content ? (content as string) : '오프라인 메모 적는 곳'}
//       </AutoResizeText>
//     </div>
//   );
// };

interface OnlineCardBGProps {
  day: number;
}

const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
  const cardName = "online_" + getCardType(day);
  return (
    <div
      style={{
        ...cardSize[getCardType(day)],
      }}
      className="absolute -z-10"
    >
      <img
        style={{ ...cardSize[getCardType(day)] }}

        src={Imgs["first"][cardName].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

// const CardOverlay = ({ day }: OnlineCardBGProps) => {
//   return (
//     <div
//       style={{
//         ...CARD_SIZES.ONLINE,
//       }}
//       className="absolute z-50 opacity-40"
//     >
//       <img
//         className="object-cover w-full h-full"
//         src={Imgs['first']['online_overlay'].src.replace('./', '/')}
//         alt="online"
//       />
//     </div>
//   );
// };

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  const offlineCardName = "offline_" + getCardType(day);
  return (
    <div
      style={{
        ...cardSize[getCardType(day)],
      }}
      key={day}
    >
      <img
        src={Imgs[currentTheme || "first"][offlineCardName].src.replace(
          "./",
          "/",
        )}
        alt="offline"
        style={{
          ...cardSize[getCardType(day)],
        }}
        draggable={false}
      />
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

  const pos: CSSProperties[] = [
    { left: 1164, top: 504 },
    { left: 2106, top: 504 },
    { left: 3048, top: 504 },
    { left: 1080, top: 1340 },
    { left: 1800, top: 1272 },
    { left: 2516, top: 1340 },
    { left: 3232, top: 1272 },
  ];

  return (
    <>
      <div
        style={{ ...cardSize[getCardType(time.day)], ...pos[time.day] }}
        key={time.day}
        className="absolute flex justify-center"
      >
        {time.isOffline ? (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={true}
            />

            <OfflineCard day={time.day} />
          </>
        ) : (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={time.isOffline}
            />

            <CardSubTitle content={entrySubTitle} day={time.day} />
            <CardMainTitle content={entryMainTitle} day={time.day} />

            <CardStreamingTime
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
              day={time.day}
            />

            <OnlineCardBG day={time.day} />
          </>
        )}
      </div>
    </>
  );
};

export default TimeTableCell;
