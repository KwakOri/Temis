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
  COMP_COLORS,
  COMP_FONTS,
} from "../_settings/settings";
import { createTextShadow, createTextStroke } from "@/utils/utils";

interface CardOfflineMemoProps {
  content: string | null;
  day: number;
}

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

const CardStreamingDay = ({
  currentTheme,
  day,
  isOffline,
}: CardStreamingDayProps) => {
  const enDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return (
    <>
      <p
        style={{
          width: 200,
          height: 100,
          top: 30,
          left: 252,
          fontSize: 52,
          fontWeight: 700,
          fontFamily: COMP_FONTS.STREAMING_DAY,
          color: COMP_COLORS.STREAMING_DAY,
          ...createTextStroke({
            color: isOffline ? "#C38D38" : BASE_COLORS.first.secondary,
            width: 1.5,
          }),
          ...createTextShadow({
            color: isOffline ? "#9E7E68" : "#406FBF",
            blur: 2,
          }),
          rotate: "1.9deg",
        }}

        className="absolute flex justify-start items-center"
      >
        {enDays[day].toLocaleUpperCase()}
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
        width: 140,
        height: 120,
        top: 44,
        left: 68,
        fontSize: 85,
        fontFamily: COMP_FONTS.STREAMING_DATE,
        fontWeight: 700,
        color: isOffline ? "#A8731C" : BASE_COLORS.first.secondary,
        rotate: "-11.8deg",
        ...createTextStroke({ color: "#ffffff", width: 1 }),
      }}
      className=" absolute flex justify-center items-center"
    >
      {padZero(date.getDate())}
    </p>
  );
};

const CardStreamingTime = ({
  day,
  time,
  currentTheme,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  const [zone, temp_time] = formatTime(time, "half").split(" ");
  const [hour, minute] = temp_time.split(":");
  const formattedHour = hour[0] === "0" ? hour[1] : hour;
  const formattedTime = zone + " " + formattedHour + ":" + minute;

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        width: 200,
        height: 60,
        lineHeight: 1,
        fontSize: 30,
        top: 178,
        left: 312,
        fontWeight: 700,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : formattedTime}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: 100,
        width: 540,
        top: 242,
        left: 272,
      }}
      className="absolute flex justify-start items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
        className="leading-none text-left"
        maxFontSize={60}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardOfflineMemo = ({ content, day }: CardOfflineMemoProps) => {
  return (
    <div
      style={{
        height: 200,
        width: 540,
        top: 220,
        left: 324,
      }}
      className="absolute flex justify-start items-start shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: "#9C7C67",
          fontWeight: 500,
          lineHeight: 1.35,
        }}
        className="leading-none text-left"
        maxFontSize={32}
        multiline={true}
      >
        {content ? (content as string) : ""}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  return (
    <div
      style={{
        width: 540,
        height: 80,
        top: 344,
        left: 272,
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
          fontWeight: 700,
        }}
        className="leading-none text-left w-full"
        maxFontSize={40}
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
  const cardName = "online";
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
  return (
    <div
      style={{
        ...CARD_SIZES.OFFLINE,
      }}
      key={day}
    >
      <img
        src={Imgs[currentTheme || "first"]["offline"].src.replace("./", "/")}
        alt="offline"
        style={{
          ...CARD_SIZES.OFFLINE,
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

  const pos = [
    { left: 1232, top: 560, rotate: "3deg" },
    { left: 2170, top: 550, rotate: "-3deg" },
    { left: 3096, top: 552, rotate: "6.6deg" },
    { left: 1217, top: 1052, rotate: "5.5deg" },
    { left: 2172, top: 1055, rotate: "-5.1deg" },
    { left: 1196, top: 1583, rotate: "-3.3deg" },
    { left: 2128, top: 1588, rotate: "5deg" },
  ];

  return (
    <>
      <div
        style={{ ...CARD_SIZES.ONLINE, ...pos[time.day] }}
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
            <CardStreamingDate
              day={time.day}
              date={weekDate}
              currentTheme={currentTheme}
              isOffline={time.isOffline}
            />
            {time.offlineMemo && (
              <CardOfflineMemo content={time.offlineMemo} day={time.day} />
            )}
            <OfflineCard day={time.day} />
          </>
        ) : (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={time.isOffline}
            />
            <CardStreamingDate
              day={time.day}
              date={weekDate}
              currentTheme={currentTheme}
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
