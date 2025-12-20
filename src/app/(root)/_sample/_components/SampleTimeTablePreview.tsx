import { useTimeTable } from "@/contexts/TimeTableContext";
import { PropsWithChildren } from "react";

const TimeTableSamplePreview = ({ children }: PropsWithChildren) => {
  const { state, actions } = useTimeTable();
  const { scale, weekDates, isMobile, captureSize } = state;

  // 동적으로 템플릿 크기 사용 (기본값으로 1280x720 사용)

  if (weekDates.length === 0) return null;

  return (
    <div
      className="flex flex-col justify-start items-center w-full h-full rounded-3xl border-2 border-[#E2D4C4] overflow-hidden relative"
      style={{
        width: 1360,
        height: 925,
        backgroundImage: `url("/images/landing_bg.png")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="z-10 flex flex-col items-center gap-6 py-8">
        <p style={{ color: "#F56015" }} className="font-bold text-3xl">
          비싼 포토샵을 대체! 편의성을 극대화!
        </p>
        <div className="flex flex-col items-center">
          <p
            style={{ fontSize: 64, color: "#1B1612", lineHeight: 1.2 }}
            className="font-extrabold"
          >
            버튜버가 만든, 버튜버를 위한
          </p>
          <p
            style={{ fontSize: 64, color: "#1B1612", lineHeight: 1.2 }}
            className="font-extrabold"
          >
            디자인 플랫폼
          </p>
        </div>
      </div>
      <div
        style={{
          width: 4000 * 0.275 + 104,
          height: 2250 * 0.275 + 104,
          background:
            "linear-gradient(to bottom,rgba(252,113,43,1) 0%,rgba(253,147,25,1) 70%,rgba(253,130,34,0) 100%",
        }}
        className="relative z-30 flex justify-center items-center rounded-[72px] shrink-0"
      >
        <img
          style={{ rotate: "-12deg" }}
          width={"10%"}
          className="absolute top-44 -left-12 z-50"
          src="/images/calendar.svg"
          alt=""
        />
        <div
          className="relative shadow-lg rounded-sm z-20 "
          style={{
            width: 4000 * 0.275,
            height: 2250 * 0.275,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default TimeTableSamplePreview;
