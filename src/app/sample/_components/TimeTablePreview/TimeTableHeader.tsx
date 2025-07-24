import React from "react";

interface TimeTableHeaderProps {
  weekDates: Date[];
}

const TimeTableHeader: React.FC<TimeTableHeaderProps> = ({ weekDates }) => {
  const descriptionFontSize = 24;
  return (
    <div
      className="col-span-2 row-span-1 w-full h-full  flex flex-col justify-center items-center gap-4"
      style={{
        fontSize: `${descriptionFontSize}px`,
        backgroundImage: "url(/img/title-01.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <h1 className="">TITLE</h1>
      {weekDates.length > 0 ? (
        <p className="">
          {weekDates[0].getFullYear()}.{weekDates[0].getMonth() + 1}.
          {weekDates[0].getDate()} - {weekDates[6].getFullYear()}.
          {weekDates[6].getMonth() + 1}.{weekDates[6].getDate()}
        </p>
      ) : null}
    </div>
  );
};

export default TimeTableHeader;
