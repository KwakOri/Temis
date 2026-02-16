import React, { CSSProperties, PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard, TEntry } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { weekdays } from "@/utils/time-table/data";

import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import { COMP_COLORS, COMP_FONTS, weekdayOption } from "../_settings/settings";

type TCARD = "A" | "B" | "C" | "D";

interface ICARD {
  cardType: TCARD;
}

export type dayProps = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const CARD_ANGLES: number[] = [0, 0, 0, 0, 0, 0, 0];
const CARD_POSITIONS: CSSProperties[] = [
  { top: 0, left: 0 },
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
    width: 1156,
    height: 755,
  },
  B: {
    width: 914,
    height: 648,
  },
  C: {
    width: 784,
    height: 549,
  },
  D: {
    width: 849,
    height: 449,
  },
};

interface CardStreamingDayProps extends ICARD {
  currentTheme?: TTheme;
  day: number;
}

interface CardStreamingTimeProps extends ICARD {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
}

interface CardStreamingDateProps extends ICARD {
  date: number;
  currentTheme?: TTheme;
}

interface CardMainTitleProps extends ICARD {
  currentTheme?: TTheme;
  content: string;
  day: number;
}

interface CardSubTitleProps extends ICARD {
  content: string | null;
  day: number;
}

interface OnlineCardBGProps extends ICARD {
  day: number;
}

interface OfflineCardProps extends ICARD {
  day: number;
  currentTheme?: TTheme;
}

interface CardStreamingDayAndTimeProps {
  time: string;
  currentTheme?: TTheme;
  isGuerrilla: boolean;
  day: number;
}

interface OnlineCardProps {

  cardType: TCARD;
  day: number;
  entry: TEntry;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

const CardStreamingDay = ({ cardType, currentTheme, day }: CardStreamingDayProps) => {

  const CONTAINER_STYLES: { A: CSSProperties, B: CSSProperties, C: CSSProperties, D: CSSProperties, } = {
    A: { fontSize: 96, top: 112, left: 488, width: 278, height: 100 },
    B: { fontSize: 80, top: 100, left: 360, width: 238, height: 100 },
    C: { fontSize: 70, top: 72, left: 294, width: 238, height: 100 },
    D: { fontSize: 70, top: 40, left: 264, width: 238, height: 100 },
  }


  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: COMP_COLORS.STREAMING_DAY,
        filter: "drop-shadow(0px 0px 6px #335B88)",
        ...CONTAINER_STYLES[cardType]


      }}
      className="absolute flex justify-center items-center"
    >
      {weekdays[weekdayOption][day].toUpperCase()}요일
    </p>
  );
};


const CardStreamingDate = ({ date, currentTheme }: CardStreamingDateProps) => {
  return (
    <p
      style={{
        color: COMP_COLORS.STREAMING_DATE,
        fontFamily: COMP_FONTS.STREAMING_DATE,
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
  cardType
}: CardStreamingTimeProps) => {
  const CONTAINER_STYLES: { A: CSSProperties, B: CSSProperties, C: CSSProperties, D: CSSProperties, } = {
    A: { fontSize: 70, top: 218, left: 488, width: 278, height: 100 },
    B: { fontSize: 60, top: 190, left: 360, width: 238, height: 100 },
    C: { fontSize: 60, top: 156, left: 296, width: 238, height: 100 },
    D: { fontSize: 48, top: 118, left: 264, width: 238, height: 100 },
  }
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        lineHeight: 1,
        ...CONTAINER_STYLES[cardType]
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "full")}
    </p>
  );
};

const CardMainTitle = ({
  currentTheme,
  content,
  day,
  cardType
}: CardMainTitleProps) => {
  const MAX_FONT_SIZES = {
    A: 160,
    B: 120,
    C: 110,
    D: 110
  }

  const TOP_POSITIONS = {
    A: 272,
    B: 208,
    C: 148,
    D: 96
  }

  return (
    <div
      style={{
        height: 320,
        width: "90%",
        top: TOP_POSITIONS[cardType],
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          fontWeight: 900,
          lineHeight: 1,
        }}
        className="leading-none text-center"
        maxFontSize={MAX_FONT_SIZES[cardType]}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ cardType, content, day }: CardSubTitleProps) => {
  const MAX_FONT_SIZES = {
    A: 96,
    B: 80,
    C: 70,
    D: 70
  }

  const TOP_POSITIONS = {
    A: 476,
    B: 380,
    C: 312,
    D: 256
  }
  return (
    <div
      style={{
        width: 600,
        height: 200,
        top: TOP_POSITIONS[cardType]
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
          filter: "drop-shadow(0px 0px 6px #335B88)",

        }}
        className="leading-none text-center w-full"
        maxFontSize={MAX_FONT_SIZES[cardType]}
        multiline
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};



const OnlineCardBG = ({ cardType, day }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        ...cardSizes[cardType],
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"]["online" + cardType].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OnlineCard = ({ cardType, day, entry }: OnlineCardProps) => {
  const time = (entry.time as string) || "09:00";
  const mainTitle = (entry.mainTitle as string) || "";
  const subTitle = (entry.subTitle as string) || "";
  const isGuerrilla = (entry.isGuerrilla as boolean) as boolean;
  return (
    <div
      style={{ ...cardSizes[cardType] }}
      className="relative flex justify-center "
    >
      <CardStreamingDay cardType={cardType} day={day} />
      <CardStreamingTime cardType={cardType} day={day} isGuerrilla={isGuerrilla} time={time} />
      <CardMainTitle cardType={cardType} content={mainTitle} day={day} />
      <CardSubTitle cardType={cardType} content={subTitle} day={day} />
      <OnlineCardBG cardType={cardType} day={day} />
    </div>
  );
};

interface MultipleCardProps {
  time: TDefaultCard;
}

const singleTypeCards: TCARD[] = ["A", "A", "A", "B", "B", "B", "B"];
const multipleTypeCards: TCARD[] = ["C", "C", "C", "D", "D", "D", "D"];
const multipleWrapperTypes: TCARD[] = ["A", "A", "A", "B", "B", "B", "C"]

const MultipleCard = ({ time }: MultipleCardProps) => {
  const primaryEntry = time.entries?.[0] || {};
  const secondaryEntry = time.entries?.[1] || {};

  const isMultiple = time.entries.length > 1;

  const singleType = singleTypeCards[time.day];
  const multipleType = multipleTypeCards[time.day];
  const multipleWrapperType = multipleWrapperTypes[time.day];




  const singleCardWrapperStyles = {
    0: { rotate: "4deg", left: 40, top: 130 },
    1: { rotate: "-3.2deg", left: 1248, top: 200 },
    2: { rotate: "-6deg", left: 2410, top: 0 },
    3: { rotate: "-9deg", left: 50, top: 940 },
    4: { rotate: "4.7deg", left: 1000, top: 1100 },
    5: { rotate: "-8.6deg", left: 1890, top: 920 },
    6: { rotate: "1.9deg", left: 2840, top: 720 },
  }
  const multipleCardWrapperStyles = {
    0: { width: 1197, height: 928, rotate: "0deg", left: 65, top: 80 },
    1: { width: 1197, height: 928, rotate: "-8deg", left: 1272, top: 92 },
    2: { width: 1197, height: 928, rotate: "-7.5deg", left: 2500, top: -34 },
    3: { width: 945, height: 768, rotate: "-9deg", left: 80, top: 952 },
    4: { width: 945, height: 768, rotate: "4.7deg", left: 1010, top: 1040 },
    5: { width: 945, height: 768, rotate: "-8.6deg", left: 1880, top: 904 },
    6: { width: 1395, height: 704, rotate: "0deg", left: 2680, top: 710 },
  }

  interface multipleCardStyle { A: CSSProperties, B: CSSProperties, C: CSSProperties, D: CSSProperties, }

  const multiplePrevCardStyles: multipleCardStyle = {
    A: { zIndex: 2, rotate: "-5.5deg", top: 20, left: -4 },
    B: { zIndex: 2, rotate: "-1.6deg", },
    C: { zIndex: 2, rotate: "-8deg", top: 24 },
    D: {}
  }

  const multipleAfterCardStyles: multipleCardStyle = {
    A: { zIndex: 1, rotate: "11.2deg", top: 332, left: 400 },
    B: { zIndex: 1, rotate: "1.6deg", top: 316, left: 96 },
    C: { zIndex: 1, rotate: "5.5deg", top: 232, left: 554 },
    D: {}
  }

  return isMultiple ? <div className="absolute " style={{
    ...multipleCardWrapperStyles[time.day as dayProps]
  }}>
    <div className="absolute " style={{ ...multiplePrevCardStyles[multipleWrapperTypes[time.day as dayProps]] }}>
      <OnlineCard
        cardType={multipleType}
        day={time.day}

        entry={primaryEntry}
      />
    </div>
    <div className="absolute " style={{ ...multipleAfterCardStyles[multipleWrapperTypes[time.day as dayProps]] }}>
      <OnlineCard
        cardType={multipleType}
        day={time.day}
        entry={secondaryEntry}
      />
    </div>
  </div> : <div className="absolute" style={{ ...singleCardWrapperStyles[time.day as dayProps] }}>
    <OnlineCard
      cardType={singleType}
      day={time.day}
      entry={primaryEntry}
    />
  </div>

}

const OfflineCard = ({ cardType, day, currentTheme }: OfflineCardProps) => {
  const singleCardWrapperStyles = {
    0: { rotate: "4deg", left: 40, top: 130 },
    1: { rotate: "-3.2deg", left: 1248, top: 200 },
    2: { rotate: "-6deg", left: 2410, top: 0 },
    3: { rotate: "-9deg", left: 50, top: 940 },
    4: { rotate: "4.7deg", left: 1000, top: 1100 },
    5: { rotate: "-8.6deg", left: 1890, top: 920 },
    6: { rotate: "1.9deg", left: 2840, top: 720 },
  }
  return (
    <div style={{
        ...cardSizes[cardType],
        ...singleCardWrapperStyles[day as dayProps]
      }}
      key={day}
      className="absolute"
    >
      <img
        src={Imgs[currentTheme || "first"][
          "offline" + cardType
        ].src.replace("./", "/")}
        alt="offline"
        style={{
          ...cardSizes[cardType],
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


  return (
    <div
      style={{
        position: "absolute",
        rotate: CARD_ANGLES[time.day] + "deg",
        ...CARD_POSITIONS[time.day],
      }}
    >
      {time.isOffline ? (
        <OfflineCard cardType={singleTypeCards[time.day]} day={time.day} />
      ) : (
        <MultipleCard time={time} />
      )}
    </div>
  );
};

export default TimeTableCell;
