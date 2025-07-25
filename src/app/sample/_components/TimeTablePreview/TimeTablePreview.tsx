import TimeTableGrid from "./TimeTableGrid";

import { Imgs } from "../../_img/imgs";
import { months, TDefaultCard } from "../../_settings/general";
import {
  colors,
  fontOption,
  monthOption,
  TTheme,
} from "../../_settings/settings";
import React from "react";
import ProfileImage from "./ProfileImage";

export interface TimeTablePreviewProps {
  currentTheme: TTheme;
  scale: number;
  data: TDefaultCard[];
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

            <img className="relative" src={Imgs[currentTheme]["week"].src} />
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
