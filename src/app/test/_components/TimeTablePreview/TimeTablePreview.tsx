import TimeTableGrid from "@/app/test/_components/TimeTablePreview/TimeTableGrid";
import {
  Data,
  months,
  ThemeTypes,
} from "@/app/test/_components/TimeTablePreview/types";
import { colors } from "@/app/test/_styles/colors";
import React from "react";
import blueBG from "../../_img/blue/bg.png";
import blueFlag from "../../_img/blue/week.png";
import pinkBG from "../../_img/pink/bg.png";
import pinkFlag from "../../_img/pink/week.png";
import yellowBG from "../../_img/yellow/bg.png";
import yellowFlag from "../../_img/yellow/week.png";
import ProfileImage from "./ProfileImage";

export interface TimeTablePreviewProps {
  currentTheme: ThemeTypes;
  scale: number;
  data: Data[];
  weekDates: Date[];
  imageSrc: string | null;
  profileText: string;
}

const TimeTablePreview: React.FC<TimeTablePreviewProps> = ({
  currentTheme,
  scale,
  data,
  weekDates,
  imageSrc,
  profileText,
}) => {
  const containerWidth = 1280 * scale;
  const containerHeight = 720 * scale;

  const themeAssets = {
    blue: { bg: blueBG, flag: blueFlag },
    pink: { bg: pinkBG, flag: pinkFlag },
    yellow: { bg: yellowBG, flag: yellowFlag },
  };

  console.log(currentTheme);

  if (weekDates.length === 0) return null;
  return (
    <div className=" flex justify-center items-center grow overflow-hidden">
      <div
        className="border rounded shadow bg-gray-50"
        style={{
          width: containerWidth,
          height: containerHeight,
          transition: "width 0.3s, height 0.3s",
          overflow: "visible",
        }}
      >
        <div
          id="timetable"
          className="w-[1280px] h-[720px] box-border text-[26px] select-none font-sans origin-top-left relative overflow-hidden"
          style={{
            transform: `scale(${scale})`,
            backgroundImage: `url(${themeAssets[currentTheme].bg.src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute left-[620px] z-20">
            <div
              className="absolute z-10 w-full h-full justify-center pr-1 pb-2 flex flex-col "
              style={{
                fontFamily: "LOTTERIACHAB",
              }}
            >
              <p
                style={{
                  color: colors[currentTheme]["secondary"],
                }}
                className={`w-full h-[60px] flex justify-center items-center shrink-0`}
              >
                {months[weekDates[0].getMonth()]}
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

            <img
              className="relative"
              src={themeAssets[currentTheme].flag.src}
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
      </div>
    </div>
  );
};

export default TimeTablePreview;
