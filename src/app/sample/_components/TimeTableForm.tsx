import { TDefaultCard, weekdays } from "@/app/sample/_settings/general";
import {
  buttonThemes,
  TTheme,
  weekdayOption,
} from "@/app/sample/_settings/settings";
import React from "react";

interface TimeTableFormProps {
  data: TDefaultCard[];
  setData: React.Dispatch<React.SetStateAction<TDefaultCard[]>>;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profileText: string;
  onProfileTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentTheme: string;
  onThemeButtonClick: (value: TTheme) => void;
}

const TimeTableForm: React.FC<TimeTableFormProps> = ({
  data,
  setData,
  onImageChange,
  profileText,
  onProfileTextChange,
  currentTheme,
  onThemeButtonClick,
}) => {
  return (
    <div className="shrink-0 w-1/3 h-full flex flex-col bg-quaternary p-4">
      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-2 w-full h-16">
          {buttonThemes.map((theme) => (
            <button
              className={` rounded-md bg-gray-200 ${
                currentTheme === theme.value
                  ? "brightness-75"
                  : "hover:brightness-110 cursor-pointer"
              } `}
              key={theme.value}
              onClick={() => onThemeButtonClick(theme.value as TTheme)}
            >
              {theme.label}
            </button>
          ))}
        </div>
        <div className="flex-shrink-0 flex flex-col gap-4 justify-center items-center py-8 rounded-md">
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
          <input
            value={profileText}
            className={`bg-gray-200 rounded-md p-2 w-full`}
            onChange={onProfileTextChange}
          />
        </div>
        <div className="flex flex-col gap-2 w-full">
          {data.map((day, index) => (
            <div
              key={day.day}
              className="bg-gray-400 flex flex-col gap-2 p-4 rounded-md"
            >
              <div className="flex justify-center items-center gap-4 p-4 bg-gray-200 w-full rounded-md">
                <p>{weekdays[weekdayOption][day.day]}</p>
                <button
                  className={`shrink-0 bg-gray-300 rounded-md p-2 cursor-pointer hover:brightness-90 ${
                    day.isOffline ? "bg-gray-600 text-white" : ""
                  }`}
                  onClick={() => {
                    const newData = [...data];
                    newData[index].isOffline = !newData[index].isOffline;
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
              </div>
              <input
                value={day.topic}
                className={`bg-gray-200 rounded-md p-2 w-full`}
                onChange={(e) => {
                  const newData = [...data];
                  newData[index].topic = e.target.value;
                  setData(newData);
                }}
              />
              <textarea
                value={day.description}
                className={`bg-gray-200 rounded-md p-2  w-full`}
                onChange={(e) => {
                  const newData = [...data];
                  newData[index].description = e.target.value;
                  setData(newData);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeTableForm;
