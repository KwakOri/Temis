import React, { CSSProperties, PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard, TEntry } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { padZero } from "@/utils/date-formatter";
import { formatTime } from "@/utils/time-formatter";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import {
  BASE_COLORS,
  CARD_SIZES,
  COMP_COLORS,
  COMP_FONTS,
  MAX_FONT_SIZES,
} from "../_settings/settings";
import { createTextStroke } from "@/utils/utils";

const pos = [
  { left: 1722, top: 142 },
  { left: 2436, top: 142 },
  { left: 3150, top: 142 },
  { left: 1716, top: 910 },
  { left: 1722, top: 1376 },
  { left: 2436, top: 1376 },
  { left: 3150, top: 1376 },
];
const size = [
  { width: 688, height: 716 },
  { width: 688, height: 716 },
  { width: 688, height: 716 },
  { width: 2112, height: 432 },
  { width: 688, height: 716 },
  { width: 688, height: 716 },
  { width: 688, height: 716 },
];

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

const CardStreamingDay = ({
  currentTheme,
  day,
  isOffline,
}: CardStreamingDayProps) => {
  const days_en = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  const days_ko = ["월", "화", "수", "목", "금", "토", "일"];

  const colors = [
    "#DC5465",
    "#A9C690",
    "#6B9AD0",
    "#DC5465",
    "#A9C690",
    "#6B9AD0",
    "#DC5465",
  ];

  return (
    <>
      {day === 3 ? null : (
        <p
          style={{
            width: 240,
            height: 100,
            top: 18,
            left: 176,
            fontSize: 58,
            fontFamily: COMP_FONTS.STREAMING_DAY,
            fontWeight: 700,
            color: "#FFFFFF",
            ...createTextStroke({ color: colors[day], width: 8 }),
            paintOrder: "stroke fill",
            strokeLinejoin: "round",
          }}
          className="absolute flex justify-center items-center "
        >
          {days_en[day].toUpperCase()} {days_ko[day]}
        </p>
      )}
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
    <>
      {day === 3 ? (
        <p
          style={{
            width: 170,
            height: 56,
            top: 76,
            left: 494,
            fontSize: 42,
            fontFamily: COMP_FONTS.STREAMING_DAY,
            color: BASE_COLORS.first.primary,
          }}
          className=" absolute flex justify-center items-center "
        >
          {padZero(date.getMonth() + 1)}.{padZero(date.getDate())}
        </p>
      ) : (
        <p
          style={{
            width: 152,
            height: 56,
            top: 178,
            left: 460,
            fontSize: 36,
            fontFamily: COMP_FONTS.STREAMING_DAY,
            color: BASE_COLORS.first.primary,
          }}
          className=" absolute flex justify-center items-center"
        >
          {padZero(date.getMonth() + 1)}.{padZero(date.getDate())}
        </p>
      )}
    </>
  );
};

const CardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
  day,
}: CardStreamingTimeProps) => {
  return (
    <>
      {day === 3 ? (
        <p
          style={{
            fontFamily: COMP_FONTS.STREAMING_TIME,
            color: BASE_COLORS.first.primary,
            width: 270,
            height: 64,
            lineHeight: 1,
            fontSize: 54,
            top: 200,
            left: 1712,
          }}
          className=" absolute flex justify-center items-center "
        >
          {isGuerrilla ? "게릴라" : formatTime(time, "full")}
        </p>
      ) : (
        <p
          style={{
            fontFamily: COMP_FONTS.STREAMING_TIME,
            color: BASE_COLORS.first.primary,
            width: 270,
            height: 64,
            lineHeight: 1,
            fontSize: 54,
            top: 550,
            left: 210,
          }}
          className=" absolute flex justify-center items-center "
        >
          {isGuerrilla ? "게릴라" : formatTime(time, "full")}
        </p>
      )}
    </>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <>
      {day === 3 ? (
        <div
          style={{
            height: 120,
            width: 1000,
            top: 116,
            left: 628,
          }}
          className="absolute flex justify-center items-center shrink-0 "
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.MAIN_TITLE,
              color: BASE_COLORS.first.primary,
              fontWeight: 700,
            }}
            className="leading-none text-center"
            maxFontSize={100}
          >
            {content ? (content as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      ) : (
        <div
          style={{
            height: 120,
            width: 540,
            top: 264,
          }}
          className="absolute flex justify-center items-center shrink-0"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.MAIN_TITLE,
              color: BASE_COLORS.first.primary,
              fontWeight: 700,
            }}
            className="leading-none text-center"
            maxFontSize={60}
          >
            {content ? (content as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      )}
    </>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  return (
    <>
      {day === 3 ? (
        <div
          style={{
            width: 1000,
            height: 100,
            top: 236,
            left: 628,
          }}
          className="absolute flex justify-center items-center "
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.SUB_TITLE,
              color: BASE_COLORS.first.primary,
            }}
            className="leading-none text-center w-full"
            maxFontSize={70}
          >
            {content ? (content as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      ) : (
        <div
          style={{
            width: 540,
            height: 60,
            top: 398,
          }}
          className="absolute flex justify-center items-center "
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.SUB_TITLE,
              color: BASE_COLORS.first.primary,
            }}
            className="leading-none text-center w-full"
            maxFontSize={38}
          >
            {content ? (content as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      )}
    </>
  );
};

const CardOfflineMemo = ({ content, day }: CardOfflineMemoProps) => {
  return (
    <div
      style={{
        width: 900,
        height: 80,
        top: 88,
        left: 1152,
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: "#B0C2AB",
          fontWeight: 700,
        }}
        className="leading-none text-left w-full"
        maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
      >
        {content ? (content as string) : "오프라인 메모 적는 곳"}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  day: number;
  isOffline: boolean;
}

const OnlineCardBG = ({ day, isOffline }: OnlineCardBGProps) => {
  const status = isOffline ? "offline" : "online";
  const orders = ["a", "b", "c", "d", "b", "c", "a"];
  const cardName = status + "_" + orders[day];

  const size = [
    { width: 688, height: 716 },
    { width: 688, height: 716 },
    { width: 688, height: 716 },
    { width: 2112, height: 432 },
    { width: 688, height: 716 },
    { width: 688, height: 716 },
    { width: 688, height: 716 },
  ];

  return (
    <div
      style={{
        ...size[day],
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

const CardOverlay = ({ day }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        ...CARD_SIZES.ONLINE,
      }}
      className="absolute z-50 opacity-40"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"]["online_overlay"].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

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

interface MultiCardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
  i: number;
}

interface MultiCardMainTitleProps {
  currentTheme?: TTheme;
  content: string;
  day: number;
}

interface MultiCardSubTitleProps {
  content: string | null;
  day: number;
}

const MultiCardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
  day,
  i,
}: MultiCardStreamingTimeProps) => {
  return (
    <>
      {day === 3 ? (
        <div
          style={{
            width: 256,
            height: 56,
            top: day === 3 && i === 1 ? 64 : 88,
            left: 1386,
          }}
          className=" absolute flex justify-center items-center "
        >
          <p
            className="relative z-10"
            style={{
              fontSize: 55,
              fontFamily: COMP_FONTS.STREAMING_DAY,
              color: BASE_COLORS.first.primary,
            }}
          >
            {isGuerrilla ? "게릴라" : formatTime(time, "full")}
          </p>
        </div>
      ) : (
        <div
          style={{
            width: 152,
            height: 56,
            top: 116,
            left: 460,
          }}
          className=" absolute flex justify-center items-center"
        >
          <p
            className="relative z-10"
            style={{
              fontSize: 35,
              fontFamily: COMP_FONTS.STREAMING_DAY,
              color: BASE_COLORS.first.primary,
            }}
          >
            {isGuerrilla ? "게릴라" : formatTime(time, "full")}
          </p>
        </div>
      )}
    </>
  );
};

const MultiCardMainTitle = ({
  currentTheme,
  content,
  day,
}: MultiCardMainTitleProps) => {
  return (
    <>
      {day === 3 ? (
        <div
          style={{
            height: 120,
            width: 660,
            top: 24,
            left: 90,
          }}
          className="absolute flex justify-start items-center shrink-0"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.MAIN_TITLE,
              color: BASE_COLORS.first.primary,
              fontWeight: 700,
              letterSpacing: -2,
            }}
            className="leading-none text-left"
            maxFontSize={80}
          >
            {content ? (content as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      ) : (
        <div
          style={{
            height: 100,
            width: 488,
            top: 18,
            left: 92,
          }}
          className="absolute flex justify-start items-center shrink-0"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.MAIN_TITLE,
              color: BASE_COLORS.first.primary,
              fontWeight: 700,
              letterSpacing: -2,
            }}
            className="leading-none text-left"
            maxFontSize={50}
          >
            {content ? (content as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      )}
    </>
  );
};

const MultiCardSubTitle = ({ content, day }: MultiCardSubTitleProps) => {
  return (
    <>
      {day === 3 ? (
        <div
          style={{
            height: 120,
            width: 560,
            top: 30,
            left: 758,
          }}
          className="absolute flex justify-start items-center "
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.SUB_TITLE,
              color: COMP_COLORS.SUB_TITLE,
            }}
            className="leading-none text-left w-full"
            maxFontSize={70}
          >
            {content ? (content as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      ) : (
        <div
          style={{
            height: 60,
            width: 340,
            top: 106,
            left: 80,
          }}
          className="absolute flex justify-start items-center"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.SUB_TITLE,
              color: COMP_COLORS.SUB_TITLE,
            }}
            className="leading-none text-left w-full"
            maxFontSize={40}
          >
            {content ? (content as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      )}
    </>
  );
};

const MultiCard = ({ day }: { day: number }) => {
  const orders = ["a", "b", "c", "d", "b", "c", "a"];
  const cardName = "multi_" + orders[day];

  return (
    <div
      style={{
        ...size[day],
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"][cardName].src.replace("./", "/")}
        alt="multi"
        style={{
          ...size[day],
        }}
      />
    </div>
  );
};

interface EntryCardProps {
  style?: CSSProperties;
  entry: TEntry;
  day: number;
  i: number;
}

const EntryCard = ({ entry, style, day, i }: EntryCardProps) => {
  return (
    <>
      {day === 3 ? (
        <div
          className="absolute"
          style={{ width: 1740, left: 332, height: 168, ...style }}
        >
          <MultiCardMainTitle content={entry.mainTitle as string} day={day} />
          <MultiCardSubTitle content={entry.subTitle as string} day={day} />
          <MultiCardStreamingTime
            i={i}
            isGuerrilla={entry.isGuerrilla}
            time={entry.time}
            day={day}
          />
        </div>
      ) : (
        <div
          className="absolute"
          style={{ width: 600, left: 0, height: 180, ...style }}
        >
          <MultiCardMainTitle content={entry.mainTitle as string} day={day} />
          <MultiCardSubTitle content={entry.subTitle as string} day={day} />
          <MultiCardStreamingTime
            i={i}
            isGuerrilla={entry.isGuerrilla}
            time={entry.time}
            day={day}
          />
        </div>
      )}
    </>
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
        style={{ ...size[time.day], ...pos[time.day] }}
        key={time.day}
        className="absolute flex justify-center"
      >
        {time.isOffline ? (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={time.isOffline}
            />
            {/* <CardStreamingDate
              date={weekDate}
              day={time.day}
              isOffline={time.isOffline}
            /> */}
            <OnlineCardBG isOffline={time.isOffline} day={time.day} />
          </>
        ) : isMultiple ? (
          <>
            {time.day === 3 ? (
              <>
                <EntryCard
                  i={0}
                  entry={time.entries[0]}
                  style={{ top: 48 }}
                  day={time.day}
                />
                <EntryCard
                  i={1}
                  entry={time.entries[1]}
                  style={{ top: 212 }}
                  day={time.day}
                />

                <CardStreamingDay
                  currentTheme={currentTheme}
                  day={time.day}
                  isOffline={time.isOffline}
                />
                {time.day !== 3 && (
                  <CardStreamingDate
                    date={weekDate}
                    day={time.day}
                    isOffline={time.isOffline}
                  />
                )}

                <MultiCard day={time.day} />
              </>
            ) : (
              <>
                <EntryCard
                  i={0}
                  entry={time.entries[0]}
                  style={{ top: 232 }}
                  day={time.day}
                />
                <EntryCard
                  i={1}
                  entry={time.entries[1]}
                  style={{ top: 434 }}
                  day={time.day}
                />

                <CardStreamingDay
                  currentTheme={currentTheme}
                  day={time.day}
                  isOffline={time.isOffline}
                />
                {time.day !== 3 && (
                  <CardStreamingDate
                    date={weekDate}
                    day={time.day}
                    isOffline={time.isOffline}
                  />
                )}

                <MultiCard day={time.day} />
              </>
            )}
          </>
        ) : (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={time.isOffline}
            />
            <CardStreamingDate
              date={weekDate}
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

            <OnlineCardBG isOffline={time.isOffline} day={time.day} />
          </>
        )}
      </div>
    </>
  );
};

export default TimeTableCell;
