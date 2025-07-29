import Image from "next/image";
import React from "react";
import { Imgs } from "../../_img/imgs";
import { months, TDefaultCard } from "../../_settings/general";
import {
  colors,
  fontOption,
  monthOption,
  TTheme,
} from "../../_settings/settings";
import ProfileImage from "./ProfileImage";
import TimeTableGrid from "./TimeTableGrid";

export interface TimeTableContentProps {
  currentTheme: TTheme;
  scale: number;
  data: TDefaultCard[];
  weekDates: Date[];
  imageSrc: string | null;
  profileText: string;
}

const TimeTableContent: React.FC<TimeTableContentProps> = ({
  currentTheme,
  scale,
  data,
  weekDates,
  imageSrc,
  profileText,
}) => {
  return (
    <div
      id="timetable"
      className="w-[1280px] h-[720px] box-border text-[26px] select-none font-sans origin-top-left relative overflow-visible shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
      style={{
        transform: `scale(${scale})`,
        backgroundImage: `url(${Imgs[currentTheme].bg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
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
            <p className="text-[26px] leading-none">
              {weekDates[0].getDate()}
            </p>
            <p className="text-[26px] leading-4.5">~</p>
            <p className="text-[26px] leading-none">
              {weekDates[6].getDate()}
            </p>
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
      <TimeTableGrid
        data={data}
        weekDates={weekDates}
        currentTheme={currentTheme}
      />
      <ProfileImage
        imageSrc={imageSrc}
        profileText={profileText}
        currentTheme={currentTheme}
      />
    </div>
  );
};

export default TimeTableContent;