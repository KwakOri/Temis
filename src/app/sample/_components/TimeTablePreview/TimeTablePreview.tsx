import TimeTableGrid from "./TimeTableGrid";

import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { Imgs } from "../../_img/imgs";
import { months, TDefaultCard } from "../../_settings/general";
import {
  colors,
  fontOption,
  monthOption,
  TTheme,
} from "../../_settings/settings";
import ProfileImage from "./ProfileImage";

export interface TimeTablePreviewProps {
  currentTheme: TTheme;
  scale: number;
  data: TDefaultCard[];
  weekDates: Date[];
  imageSrc: string | null;
  profileText: string;
  isMobile: boolean;
}

const TimeTablePreview: React.FC<TimeTablePreviewProps> = ({
  currentTheme,
  scale,
  data,
  weekDates,
  imageSrc,
  profileText,
  isMobile,
}) => {
  const [dimensions, setDimensions] = useState({
    width: 1280 * scale,
    height: 720 * scale,
    actualScale: scale,
  });

  // 모바일에서 화면 너비에 맞춘 크기 계산
  const calculateMobileSize = useCallback(() => {
    if (typeof window === "undefined")
      return {
        width: 1280 * scale,
        height: 720 * scale,
        actualScale: scale,
      };

    if (!isMobile)
      return {
        width: 1280 * scale,
        height: 720 * scale,
        actualScale: scale,
      };

    // 모바일에서는 화면 너비의 90%를 사용 (여백 고려)
    const availableWidth = window.innerWidth * 0.9;
    const aspectRatio = 1280 / 720; // 16:9 비율
    const calculatedHeight = availableWidth / aspectRatio;

    // 실제 scale 계산 (1280 기준)
    const actualScale = availableWidth / 1280;

    return {
      width: availableWidth,
      height: calculatedHeight,
      actualScale: actualScale,
    };
  }, [scale, isMobile]);

  // 화면 크기나 scale이 변경될 때 크기 재계산
  useEffect(() => {
    const updateDimensions = () => {
      const newDimensions = calculateMobileSize();
      setDimensions(newDimensions);
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, [calculateMobileSize]);

  const {
    width: containerWidth,
    height: containerHeight,
    actualScale,
  } = dimensions;

  if (weekDates.length === 0) return null;
  return (
    <div
      className="flex justify-center items-center md:overflow-hidden w-full md:w-3/4"
      style={{
        // 모바일에서 명시적인 높이 설정, 데스크톱에서는 grow 사용
        height: isMobile ? containerHeight : "auto",
        flexGrow: isMobile ? 0 : 1,
      }}
    >
      <div
        className="shadow-md"
        style={{
          width: containerWidth,
          height: containerHeight,
          transition: "width 0.1s, height 0.1s",
          overflow: "visible",
        }}
      >
        <div
          id="timetable"
          className="w-[1280px] h-[720px] box-border text-[26px] select-none font-sans origin-top-left relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
          style={{
            transform: `scale(${actualScale})`,
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
      </div>
    </div>
  );
};

export default TimeTablePreview;
