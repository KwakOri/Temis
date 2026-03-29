import { authLinks } from "@/app/(root)/_constants";
import AuthOptions from "@/components/UI/AuthOptions/AuthOptions";
import Link from "next/link";

const MainHeader = () => {
  return (
    <header className="relative flex justify-between items-center h-[114px]">
      <h1
        style={{ fontFamily: "Paperozi" }}
        className="text-[40px] font-semibold"
      >
        TEMIS
      </h1>
      {/* <div className="w-full h-full flex justify-center items-center">
        <SegmentedControl items={mainCategories} />
      </div> */}
      <div
        style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.25))" }}
        className="h-[56px] flex justify-between items-center rounded-full gap-[10px] bg-[#F3E9E7] border-2 border-[#E2D4C4] p-1"
      >
        <Link
          style={{ fontFamily: "Pretendard" }}
          className="text-2xl h-full px-8 flex justify-center items-center hover:brightness-75 rounded-full"
          href="/#"
        >
          SHOP
        </Link>

        <Link
          style={{ fontFamily: "Pretendard" }}
          className="text-2xl h-full px-8 flex justify-center items-center hover:brightness-75 rounded-full"
          href="/#"
        >
          PORTFOLIO
        </Link>

        <Link
          style={{ fontFamily: "Pretendard" }}
          className="text-2xl h-full px-8 flex justify-center items-center hover:brightness-75 rounded-full"
          href="/#"
        >
          PROGRESS
        </Link>
      </div>
      <AuthOptions items={authLinks} />
    </header>
  );
};

export default MainHeader;
