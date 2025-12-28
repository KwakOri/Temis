import { TDefaultCard, TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import Link from "next/link";

export interface MobileTimeTableViewProps {
  currentTheme: TTheme;
  data: TDefaultCard[];
  placeholders: TPlaceholders;
}

const MobileTimeTableView = ({
  currentTheme,
  data,
  placeholders,
}: MobileTimeTableViewProps) => {
  return (
    <div
      className="w-full h-full p-4 flex flex-col items-center justify-center gap-6 overflow-hidden"
      style={{
        backgroundImage: "url(/images/landing_bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* 상단 텍스트 섹션 */}
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <p
          style={{ color: "#F56015" }}
          className="font-bold text-xl md:text-2xl lg:text-3xl"
        >
          비싼 포토샵을 대체! 편의성을 극대화!
        </p>
        <div className="flex flex-col items-center">
          <p
            style={{ color: "#1B1612", lineHeight: 1.2 }}
            className="font-extrabold text-3xl md:text-5xl lg:text-6xl"
          >
            버튜버가 만든, 버튜버를 위한
          </p>
          <p
            style={{ color: "#1B1612", lineHeight: 1.2 }}
            className="font-extrabold text-3xl md:text-5xl lg:text-6xl"
          >
            디자인 플랫폼
          </p>
        </div>
      </div>

      <p className="text-gray-600 text-sm">
        데스크탑 환경에서 더 나은 경험을 제공합니다
      </p>
      <Link
        href="/time-table-tester"
        className="w-full max-w-sm md:max-w-md bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl text-center transition-colors shadow-lg"
      >
        테스트 페이지로 이동
      </Link>

      {/* 샘플 이미지 */}
      <div className="w-full max-w-sm md:max-w-md lg:max-w-lg relative top-6">
        <img
          src="/landing/sample.png"
          alt="Sample"
          className="w-full h-auto rounded-2xl shadow-lg"
        />
      </div>
    </div>
  );
};

export default MobileTimeTableView;
