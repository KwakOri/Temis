import { TTheme } from "@/types/time-table/theme";
import { Imgs } from "../_img/imgs";
import {
  colors,
  fontOption,
  onlineCardHeight,
  onlineCardWidth,
  weekFlagCardHeight,
  weekFlagCardWidth,
} from "../_settings/settings";

interface TimeTableWeekFlagProps {
  currentTheme: TTheme;
  weekDates: Date[];
}

const TimeTableWeekFlag = ({
  currentTheme,
  weekDates,
}: TimeTableWeekFlagProps) => {
  const splitDigits = (num: number) =>
    num.toString().padStart(2, "0").split("");

  const startMonth = splitDigits(weekDates[0].getMonth() + 1);
  const startDate = splitDigits(weekDates[0].getDate());
  const endMonth = splitDigits(weekDates[6].getMonth() + 1);
  const endDate = splitDigits(weekDates[6].getDate());

  return (
    <div
      style={{
        position: "absolute",
        width: onlineCardWidth,
        height: onlineCardHeight,
        top: 134,
        left: 516,
        zIndex: 40,
      }}
    >
      <div
        className="absolute -left-5 -top-3 -z-20 justify-center flex flex-col"
        style={{
          fontFamily: fontOption.primary,
          width: weekFlagCardWidth,
          height: weekFlagCardHeight,
        }}
      >
        <div
          style={{
            color: colors[currentTheme]["secondary"],
            fontWeight: "bold",
          }}
          className="text-[45px]"
        >
          <div
            className={
              "absolute left-19 top-0 h-full flex flex-col items-center"
            }
          >
            <div className="mt-18" style={{ lineHeight: "100%" }}>
              {startMonth.map((digit, i) => (
                <span
                  className="digit"
                  style={{
                    display: "inline-block",
                    width: "1ch" /* 문자 하나 너비 기준 */,
                    textAlign: "center",
                  }}
                  key={i}
                >
                  {digit}
                </span>
              ))}
            </div>
            <div className="mt-2" style={{ lineHeight: "100%" }}>
              {startDate.map((digit, i) => (
                <span
                  className="digit"
                  style={{
                    display: "inline-block",
                    width: "1ch" /* 문자 하나 너비 기준 */,
                    textAlign: "center",
                  }}
                  key={i}
                >
                  {digit}
                </span>
              ))}
            </div>
            <div className="mt-15" style={{ lineHeight: "100%" }}>
              {endMonth.map((digit, i) => (
                <span
                  className="digit"
                  style={{
                    display: "inline-block",
                    width: "1ch" /* 문자 하나 너비 기준 */,
                    textAlign: "center",
                  }}
                  key={i}
                >
                  {digit}
                </span>
              ))}
            </div>
            <div className="mt-2" style={{ lineHeight: "100%" }}>
              {endDate.map((digit, i) => (
                <span
                  className="digit"
                  style={{
                    display: "inline-block",
                    width: "1ch" /* 문자 하나 너비 기준 */,
                    textAlign: "center",
                  }}
                  key={i}
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>
        </div>
        <img
          className="object-cover absolute inset-0 -z-10"
          alt={`week`}
          src={Imgs[currentTheme]["week"].src}
        />
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
