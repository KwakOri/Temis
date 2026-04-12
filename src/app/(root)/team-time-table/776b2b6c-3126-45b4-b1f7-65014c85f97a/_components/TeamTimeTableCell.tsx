import React, { CSSProperties } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import {
  TeamTimeTableDay,
  TeamTimeTableWeekData,
  UserScheduleData,
} from "@/types/team-timetable";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { Imgs } from "../_img/imgs";
import {
  fontOption,
  member_colors,
  Palette,
  Settings,
} from "../_settings/settings";

interface DayTextProps {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
  time: string;
  currentTheme?: TTheme;
  isMultiple?: boolean;
}

interface DateTextProps {
  date: number;
  currentTheme?: TTheme;
}

interface StreamingMainTitleProps {
  isMultiple?: boolean;
  currentTheme?: TTheme;
  mainTitle: string;
}

interface TeamTimeTableCellProps {
  data: UserScheduleData;
  weekDate: Date[];
  currentTheme: TTheme;
  order: number;
}

interface OfflineCardProps {
  currentTheme: TTheme;
}

const DayText: React.FC<DayTextProps> = ({ day }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 40,

        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      day
    </div>
  );
};

const StreamingTime: React.FC<StreamingTimeProps> = ({ time, isMultiple }) => {
  return (
    <div
      style={{
        position: "absolute",

        fontWeight: "bold",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {formatTime(time)}
    </div>
  );
};

const DateText: React.FC<DateTextProps> = ({ date }) => {
  return (
    <div
      style={{
        position: "absolute",

        zIndex: 40,

        textAlign: "center",

        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {date}
    </div>
  );
};

const StreamingMainTitle: React.FC<StreamingMainTitleProps> = ({
  isMultiple,
  mainTitle,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 40,
      }}
    >
      <AutoResizeText maxFontSize={40}>{mainTitle}</AutoResizeText>
    </div>
  );
};

const OfflineCard: React.FC<OfflineCardProps> = ({ currentTheme }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        left: 28,
        zIndex: 50,
        width: 86,
        height: 25,
      }}
    >
      <img
        src={Imgs[currentTheme]["offline"].src}
        alt={"offline"}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};

const ProfileCard = () => {};

export interface ProfileImageProps {
  order: number;
}

const ProfileImage = ({ order }: ProfileImageProps) => {
  return (
    <img
      style={Settings.profile_image}
      src={Imgs["first"]["profile" + order].src}
    />
  );
};

export interface MemberScheduleProps {
  memberSchedule: TeamTimeTableWeekData;
  memberId: number;
}

const MemberSchedule = ({ memberSchedule, memberId }: MemberScheduleProps) => {
  const themeColor = member_colors[memberId];
  return (
    <div className="flex gap-0">
      {memberSchedule.map((schedule) => {
        return (
          <ScheduleCard
            themeColor={themeColor}
            key={memberId + "-day-" + schedule.day}
            schedule={schedule}
          />
        );
      })}
    </div>
  );
};

export interface ScheduleCardProps {
  schedule: TeamTimeTableDay;
  themeColor: Palette;
}

const ScheduleCard = ({ schedule, themeColor }: ScheduleCardProps) => {
  const { isOffline, day } = schedule;
  const primarySchedule = schedule.entries[0];
  const titleTextStyle: CSSProperties = {
    fontFamily: fontOption.primary,
    fontWeight: 700,
  };

  const titleDivStyle: CSSProperties = {
    width: 300,
    height: 160,
    top: 80,
  };
  const timeTextStyle: CSSProperties = {
    fontSize: 40,
    fontFamily: fontOption.primary,
    fontWeight: 700,
  };

  const timeDivStyle: CSSProperties = {
    width: 300,
    height: 60,
    top: 294,
  };

  return (
    <div
      className="relative flex flex-col items-center"
      style={Settings.card_online}
    >
      {isOffline ? (
        <>
          <div
            style={{ ...titleDivStyle }}
            className="absolute flex justify-center items-center"
          >
            <AutoResizeText
              maxFontSize={48}
              multiline
              style={{
                ...titleTextStyle,

                color: themeColor.secondary,
              }}
            >
              재정비의 날
            </AutoResizeText>
          </div>
          <div
            className="absolute flex justify-center items-center"
            style={{ ...timeDivStyle }}
          >
            <AutoResizeText
              maxFontSize={40}
              style={{
                ...timeTextStyle,

                color: themeColor.primary,
              }}
            >
              OFFLINE
            </AutoResizeText>
          </div>
          <img
            className="absolute inset-0 -z-10"
            src={Imgs["first"]["offline"].src}
            alt=""
          />
        </>
      ) : (
        <>
          <div
            style={{
              ...titleDivStyle,
            }}
            className="absolute flex justify-center items-center"
          >
            <AutoResizeText
              maxFontSize={48}
              multiline
              style={{
                color: themeColor.primary,
                ...titleTextStyle,
              }}
            >
              {primarySchedule.mainTitle}
            </AutoResizeText>
          </div>
          <div
            className=" absolute flex justify-center items-center"
            style={{ ...timeDivStyle }}
          >
            <AutoResizeText
              maxFontSize={40}
              style={{
                ...timeTextStyle,

                color: themeColor.secondary,
              }}
            >
              {primarySchedule.isGuerrilla ? "게릴라" : primarySchedule.time}
            </AutoResizeText>
          </div>

          <img
            className="absolute inset-0 -z-10"
            src={Imgs["first"]["online"].src}
            alt=""
          />
        </>
      )}
    </div>
  );
};

const TeamTimeTableCell: React.FC<TeamTimeTableCellProps> = ({
  data,
  weekDate,
  currentTheme,
  order,
}) => {
  // 첫 번째 엔트리 또는 빈 엔트리

  const memberSchedule = data.schedule?.schedule_data;
  const isSuccess = data.success;

  const themeColor = member_colors[data.user_id];

  return (
    <div style={{ height: 405 }} className="flex items-center">
      <ProfileImage order={order} />
      {!isSuccess && (
        <div
          className="flex justify-center items-center"
          style={{ width: 2554, height: "100%" }}
        >
          <AutoResizeText
            maxFontSize={100}
            style={{
              fontFamily: fontOption.primary,
              fontWeight: 700,
              fontSize: 100,
              color: themeColor.primary,
            }}
          >
            아직 일정이 입력되지 않았습니다.
          </AutoResizeText>
        </div>
      )}
      {isSuccess && memberSchedule && (
        <MemberSchedule
          memberId={data.user_id}
          memberSchedule={memberSchedule}
        />
      )}
    </div>
    // <div className="relative" style={{}}>
    //   {/* 배경 이미지 */}
    //   <div
    //     style={{
    //       position: "absolute",
    //       top: 0,
    //       left: 0,
    //       zIndex: 30,
    //       width: "100%",
    //       height: "100%",
    //     }}
    //   >
    //     {" "}
    //     {hasContent && (
    //       <img
    //         src={Imgs[currentTheme]["online"].src}
    //         alt={"card"}
    //         draggable={false}
    //         style={{
    //           width: "100%",
    //           height: "100%",
    //           objectFit: "contain",
    //         }}
    //       />
    //     )}
    //   </div>

    //   {/* 요일 */}
    //   <DayText day={data.day} />

    //   {/* 날짜 */}
    //   <DateText date={weekDate.getDate()} />

    //   {/* 오프라인 표시 */}
    //   {data.isOffline && <OfflineCard currentTheme={currentTheme} />}

    //   {/* 시간 */}
    //   {hasContent && (
    //     <StreamingTime
    //       time={primaryEntry.time}
    //       isMultiple={isMultiple}
    //       currentTheme={currentTheme}
    //     />
    //   )}

    //   {/* 메인 타이틀 */}
    //   {hasContent && (
    //     <StreamingMainTitle
    //       isMultiple={isMultiple}
    //       mainTitle={primaryEntry.mainTitle}
    //       currentTheme={currentTheme}
    //     />
    //   )}
    // </div>
  );
};

export default TeamTimeTableCell;
