import React, { Fragment } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { useTimeTableUI } from "@/contexts/TimeTableContext";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { Imgs } from "../_img/imgs";
import { colors, fontOption, Settings } from "../_settings/settings";
import TimeTableCell from "./TimeTableCell";

interface TimeTableGridProps {
  data: TDefaultCard[];
  weekDates: Date[];
  currentTheme: TTheme;
}

const TimeTableGrid: React.FC<TimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  const { isMemoTextVisible } = useTimeTableUI();
  return (
    <div
      className="absolute grid grid-cols-3 z-20"
      style={{
        top: 96,
        left: 32,
        columnGap: 20,
        rowGap: 8,
      }}
    >
      {data.map((time, i) => (
        <Fragment key={time.day}>
          <TimeTableCell
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[i]}
            index={i}
          />
          {i === 1 && <div></div>}
          {i === 3 &&
            (isMemoTextVisible ? (
              <div
                style={{ width: 720, height: Settings.card.online.height }}
                className="flex justify-center items-center relative"
              >
                <div
                  style={{
                    position: "absolute",
                    width: 670,
                    height: 508,
                    left: 36,
                    top: 66,
                  }}
                  className="z-10 p-10 flex justify-center items-center relative"
                >
                  <div
                    style={{
                      width: 540,
                      height: 288,
                      marginTop: 10,
                    }}
                    className="flex justify-center items-center relative"
                  >
                    <AutoResizeText
                      style={{
                        lineHeight: 1.2,
                        fontFamily: fontOption.primary,
                        color: colors.first.secondary,
                        textAlign: "center",
                      }}
                      maxFontSize={72}
                      multiline
                    >{`간단한 주간\n메모는 여기에\n4줄 정도까지\n적을 수 있습니다`}</AutoResizeText>
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    width: Settings.card.online.width,
                    height: Settings.card.online.height,
                  }}
                >
                  <img
                    src={Imgs[currentTheme || "first"]["memo"].src.replace(
                      "./",
                      "/"
                    )}
                    alt="offline"
                    className="object-cover"
                  />
                </div>
              </div>
            ) : (
              <div></div>
            ))}
        </Fragment>
      ))}
    </div>
  );
};

export default TimeTableGrid;
