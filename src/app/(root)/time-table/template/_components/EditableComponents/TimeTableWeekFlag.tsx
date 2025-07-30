import Image from "next/image";
import { Imgs } from "../../_img/imgs";
import { months } from "../../_settings/general";
import {
  colors,
  fontOption,
  monthOption,
  TTheme,
} from "../../_settings/settings";

interface TimeTableWeekFlagProps {
  currentTheme: TTheme;
  weekDates: Date[];
}

const TimeTableWeekFlag = ({
  currentTheme,
  weekDates,
}: TimeTableWeekFlagProps) => {
  return (
    <div className="absolute left-[620px] z-20">
      <div
        className="absolute z-10 w-full h-full justify-center pr-1 pb-2 flex flex-col "
        style={{
          fontFamily: fontOption.secondary,
        }}
      >
        <p
          style={{
            color: colors[currentTheme]["secondary"],
          }}
          className={`w-full h-[60px] flex justify-center items-center shrink-0`}
        >
          {months[monthOption][weekDates[0].getMonth()]}
        </p>
        <div
          style={{
            color: colors[currentTheme]["secondary"],
          }}
          className="h-full grow flex flex-col justify-center items-center"
        >
          <p className="text-[26px] leading-none">{weekDates[0].getDate()}</p>
          <p className="text-[26px] leading-4.5">~</p>
          <p className="text-[26px] leading-none">{weekDates[6].getDate()}</p>
        </div>
      </div>

      <Image
        className="relative"
        src={Imgs[currentTheme]["week"].src.replace("./", "/")}
        alt="week"
        width={120}
        height={60}
      />
    </div>
  );
};

export default TimeTableWeekFlag;
