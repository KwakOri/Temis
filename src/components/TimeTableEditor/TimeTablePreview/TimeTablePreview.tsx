import React from "react";
import ProfileImage from "./ProfileImage";
import TimeTableGrid from "./TimeTableGrid";
import type { TimeTablePreviewProps } from "./types";

const TimeTablePreview: React.FC<TimeTablePreviewProps> = ({
  scale,
  data,
  weekDates,
  imageSrc,
}) => {
  const containerWidth = 1280 * scale;
  const containerHeight = 720 * scale;

  return (
    <div className="flex grow">
      <div className=" flex justify-center items-center grow">
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
              backgroundImage: "url(/board.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="w-full h-full flex flex-col">
              <TimeTableGrid data={data} weekDates={weekDates} />
              <ProfileImage imageSrc={imageSrc} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeTablePreview;
