import React, { CSSProperties, PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { weekdays } from "@/utils/time-table/data";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import { colors, fontOption, weekdayOption } from "../_settings/settings";

type TCARD = "A" | "B" | "C" | "D";

const CARD_ORDERS: TCARD[] = ["B", "C", "C", "A", "A", "D", "D"];
const CARD_ANGLES: number[] = [-5.8, 2, -13.7, -0.7, -5.6, -2.7, -2.7];
const CARD_POSITIONS: CSSProperties[] = [
  { top: 0, left: -8 },
  { top: 0, left: 1100 },
  { top: 860, left: -120 },
  { top: 950, left: 1100 },
  { top: 825, left: 1850 },
  { top: 25, left: 2355 },
  { top: 538, left: 2495 },
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

interface DayTextProps {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
}

interface DateTextProps {
  date: number;
  currentTheme?: TTheme;
}

interface CellTextMainTitleProps {
  currentTheme?: TTheme;
  mainTitle: string;
  day: number;
}

interface CellTextSubTitleProps {
  cellTextTitle: string | null;
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

interface StreamingDayAndTimeProps {
  time: string;
  currentTheme?: TTheme;
  isGuerrilla: boolean;
  day: number;
}

const StreamingDayAndTime = ({
  currentTheme,
  day,
  time,
  isGuerrilla,
}: StreamingDayAndTimeProps) => {
  const cardType = CARD_ORDERS[day];

  return (
    <>
      {cardType === "A" ? (
        <div
          style={{
            fontFamily: fontOption.primary,
            color: colors[currentTheme || "first"]["primary"],
            fontSize: 75,
            height: 80,
            width: "100%",
            top: 212,
          }}
          className="absolute flex flex-col justify-center items-center"
        >
          <p style={{ lineHeight: 1.3 }}>
            {weekdays[weekdayOption][day].toUpperCase()}
          </p>

          <p style={{ lineHeight: 1.3 }}>
            {isGuerrilla ? "게릴라" : formatTime(time, "half")}
          </p>
        </div>
      ) : cardType === "B" ? (
        <p
          style={{
            fontFamily: fontOption.primary,
            color: colors[currentTheme || "first"]["secondary"],
            fontSize: 75,
            height: 80,
            width: "100%",
            top: 168,
          }}
          className="absolute flex justify-center items-center"
        >
          {weekdays[weekdayOption][day].toUpperCase()} ::{" "}
          {isGuerrilla ? "게릴라" : formatTime(time, "half")}
        </p>
      ) : cardType === "C" ? (
        <div
          style={{
            fontFamily: fontOption.primary,
            color: colors[currentTheme || "first"]["primary"],
            fontSize: 75,
            height: 80,
            width: "100%",
            top: 176,
            paddingLeft: 100,
          }}
          className="absolute flex flex-col justify-center items-center"
        >
          <p style={{ lineHeight: 1.3 }}>
            {weekdays[weekdayOption][day].toUpperCase()}
          </p>

          <p style={{ lineHeight: 1.3 }}>
            {isGuerrilla ? "게릴라" : formatTime(time, "half")}
          </p>
        </div>
      ) : cardType === "D" ? (
        <div
          style={{
            fontFamily: fontOption.primary,
            color: colors[currentTheme || "first"]["tertiary"],

            fontWeight: 900,
            height: 126,
            width: 840,
            top: 364,
            left: 132,
            rotate: "-4.6deg",
          }}
          className="absolute flex justify-center items-center"
        >
          <p
            className="w-full flex justify-center items-center "
            style={{ fontSize: 96, lineHeight: 1.3 }}
          >
            {weekdays[weekdayOption][day].toUpperCase()}
          </p>

          <p
            className="w-full flex justify-center items-center "
            style={{ fontSize: 72, lineHeight: 1.3 }}
          >
            {isGuerrilla ? "게릴라" : formatTime(time, "half")}
          </p>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

const StreamingDay = ({ currentTheme, day }: DayTextProps) => {
  return (
    <p
      style={{
        fontFamily: fontOption.primary,
        color: colors[currentTheme || "first"]["secondary"],
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

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        color: colors[currentTheme || "first"]["primary"],

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

const StreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        width: 360,
        height: 72,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        fontSize: 64,
        top: 460,
        color: colors[currentTheme || "first"]["primary"],
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}
    </p>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
  day,
}: CellTextMainTitleProps) => {
  const cardType = CARD_ORDERS[day];
  return (
    <>
      {cardType === "A" ? (
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
              fontFamily: fontOption.primary,
              color: colors[currentTheme || "first"]["primary"],
              fontWeight: 900,
              lineHeight: 1.25,
            }}
            className="leading-none text-center"
            multiline={true}
            maxFontSize={120}
          >
            {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      ) : cardType === "B" ? (
        <div
          style={{
            height: 340,
            width: 800,
            top: 270,
            marginRight: 20,
          }}
          className="absolute flex justify-center items-center shrink-0"
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.primary,
              color: colors[currentTheme || "first"]["primary"],
              fontWeight: 900,
              lineHeight: 1.3,
            }}
            className="leading-none text-center"
            multiline={true}
            maxFontSize={130}
          >
            {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      ) : cardType === "C" ? (
        <div
          style={{
            height: 340,
            width: 800,
            top: 320,
            marginLeft: 56,
          }}
          className="absolute flex justify-center items-center shrink-0"
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.primary,
              color: colors[currentTheme || "first"]["primary"],
              fontWeight: 900,
              lineHeight: 1.3,
            }}
            className="leading-none text-center"
            multiline={true}
            maxFontSize={130}
          >
            {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      ) : cardType === "D" ? (
        <div
          style={{
            height: 160,
            width: "80%",
            top: 180,
            marginLeft: 40,
          }}
          className="absolute flex justify-start items-center shrink-0"
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.primary,
              color: colors[currentTheme || "first"]["primary"],
              fontWeight: 900,
              lineHeight: 1,
            }}
            className="leading-none text-start"
            maxFontSize={96}
          >
            {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

const CellTextTitle = ({ cellTextTitle, day }: CellTextSubTitleProps) => {
  const cardType = CARD_ORDERS[day];
  return (
    <>
      {cardType === "A" ? (
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
              fontFamily: fontOption.primary,
              color: colors["first"]["secondary"],
              fontWeight: 900,
            }}
            className="leading-none text-center w-full"
            maxFontSize={72}
            multiline
          >
            {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      ) : cardType === "B" ? (
        <div
          style={{
            width: 800,
            height: 120,
            top: 628,
          }}
          className="absolute flex justify-center items-center"
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.primary,
              color: colors["first"]["primary"],
              fontWeight: 900,
            }}
            className="leading-none text-center w-full"
            maxFontSize={75}
            multiline
          >
            {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      ) : cardType === "C" ? (
        <div
          style={{
            width: 700,
            height: 120,
            top: 662,
            marginLeft: 18,
          }}
          className="absolute flex justify-center items-center"
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.primary,
              color: colors["first"]["secondary"],
              fontWeight: 900,
            }}
            className="leading-none text-center w-full"
            maxFontSize={75}
            multiline
          >
            {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      ) : cardType === "D" ? (
        <div
          style={{
            height: 120,
            top: 80,
            width: "80%",
            marginLeft: 40,
          }}
          className="absolute flex justify-start items-center"
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.primary,
              color: colors["first"]["primary"],
              fontWeight: 100,
            }}
            className="leading-none text-left w-full"
            maxFontSize={75}
            multiline
          >
            {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      ) : (
        <></>
      )}
    </>
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
        fontFamily: fontOption.primary,
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
          <CellTextMainTitle mainTitle={entryMainTitle} day={time.day} />
          <CellTextTitle cellTextTitle={entrySubTitle} day={time.day} />
          <StreamingDayAndTime
            isGuerrilla={primaryEntry.isGuerrilla}
            time={entryTime}
            day={time.day}
          />

          <OnlineCardBG day={time.day} />
        </div>
      )}
    </div>
  );
};

export default TimeTableCell;
