import React from "react";
import type { Data } from "./TimeTableEditor";

const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

interface TimeTableFormProps {
  data: Data[];
  setData: React.Dispatch<React.SetStateAction<Data[]>>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TimeTableForm: React.FC<TimeTableFormProps> = ({
  data,
  setData,
  onImageChange,
}) => {
  return (
    <div className="w-1/3 h-full flex flex-col justify-center">
      <div className="flex flex-col gap-2 w-full">
        {data.map((day, index) => (
          <div
            key={day.day}
            className="flex justify-center items-center gap-4 p-4 bg-gray-100 w-full"
          >
            <p>{weekdays[day.day]}</p>
            <button
              className={`shrink-0 bg-gray-300 rounded-md p-2 cursor-pointer hover:brightness-90 ${
                day.isHoliday ? "bg-gray-600 text-white" : ""
              }`}
              onClick={() => {
                const newData = [...data];
                newData[index].isHoliday = !newData[index].isHoliday;
                setData(newData);
              }}
            >
              휴일
            </button>
            <input
              id={`time-${index}`}
              type="time"
              className=" bg-gray-200 rounded-md p-2"
              value={day.time}
              onChange={(e) => {
                const newData = [...data];
                newData[index].time = e.target.value;
                setData(newData);
              }}
            />
            <input
              value={day.description}
              className={`bg-gray-200 rounded-md p-2  `}
              type={"text"}
              onChange={(e) => {
                const newData = [...data];
                newData[index].description = e.target.value;
                setData(newData);
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 justify-center items-center py-8">
        <div>
          <label
            htmlFor="file-upload"
            className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
          >
            프로필 사진 업로드
          </label>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={onImageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default TimeTableForm;
