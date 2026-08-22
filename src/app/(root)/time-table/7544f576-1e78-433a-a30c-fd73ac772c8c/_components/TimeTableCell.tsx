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
  order: 1 | 2;
  currentTheme?: TTheme;
}

interface MultiCardMainTitleProps {
  currentTheme?: TTheme;
  content: string;
  order: 1 | 2;
}

interface MultiCardSubTitleProps {
  content: string | null;
  order: 1 | 2;
}

const MultiCardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
  order,
}: MultiCardStreamingTimeProps) => {
  const [hour, minute] = formatTime(time, "full").split(":");
  const formattedHour = hour[0] === "0" ? hour[1] : hour;
  const formattedTime = formattedHour + ":" + minute;

  return (
    <div
      style={{
        height: 80,
        width: 200,
        top: 16,
      }}
      className=" absolute flex justify-center items-center "
    >
      <p
        className="relative z-10"
        style={{
          fontSize: 32,
          fontFamily: COMP_FONTS.STREAMING_TIME,
          color:
            order === 1
              ? BASE_COLORS.first.primary
              : BASE_COLORS.first.secondary,
        }}
      >
        {isGuerrilla ? "게릴라" : formattedTime}
      </p>
    </div>
  );
};

const MultiCardMainTitle = ({
  currentTheme,
  content,
  order,
}: MultiCardMainTitleProps) => {
  return (
    <div
      style={{
        height: 180,
        width: 500,
        top: 98,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: order === 1 ? COMP_COLORS.MAIN_TITLE : "#D9D9D9",
          lineHeight: 1.2,
        }}
        className="leading-none text-center"
        maxFontSize={75}
        multiline
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const MultiCardSubTitle = ({ order, content }: MultiCardSubTitleProps) => {
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
  const cardName = "multi";
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
  order: 1 | 2;
  style?: CSSProperties;
  entry: TEntry;
}

const EntryCard = ({ order, entry, style }: EntryCardProps) => {
  return (
    <div
      className="absolute flex justify-center items-center "
      style={{ width: "100%", height: 300, ...style }}
    >
      <MultiCardMainTitle order={order} content={entry.mainTitle as string} />
      {/* <MultiCardSubTitle order={order} content={entry.subTitle as string} /> */}
      <MultiCardStreamingTime
        order={order}
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
  const enDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return (
    <>
      <p
        style={{
          width: 200,
          height: 100,
          top: 36,

          fontSize: 78,
          fontFamily: COMP_FONTS.STREAMING_DAY,
          color: isOffline
            ? BASE_COLORS.first.secondary
            : COMP_COLORS.STREAMING_DAY,
        }}
        className="absolute flex justify-center items-center"
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
        width: 414,
        height: 60,
        top: 144,
        left: 10,
        fontSize: 32,
        fontFamily: COMP_FONTS.STREAMING_DATE,
        fontWeight: 500,
        color: "#292F2F",
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
  const [hour, minute] = formatTime(time, "full").split(":");
  const formattedHour = hour[0] === "0" ? hour[1] : hour;
  const formattedTime = formattedHour + ":" + minute;

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        width: 440,
        height: 108,
        lineHeight: 1,
        fontSize: 56,
        top: 664,
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
        height: 240,
        width: 500,
        top: 248,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,

          lineHeight: 1.2,
        }}
        className="leading-none text-center"
        maxFontSize={90}
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
        width: 500,
        height: 80,
        top: 548,
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
          letterSpacing: 0.5,
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

  const isMultiple = time.entries.length > 1;

  return (
    <>
      <div
        style={{ ...CARD_SIZES.ONLINE }}
        key={time.day}
        className="relative flex justify-center"
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
        ) : isMultiple ? (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={time.isOffline}
            />
            <EntryCard order={1} style={{ top: 178 }} entry={time.entries[0]} />
            <EntryCard order={2} style={{ top: 482 }} entry={time.entries[1]} />
            <MultiCard day={time.day} />
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
