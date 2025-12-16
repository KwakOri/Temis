import { authLinks, mainCategories } from "@/app/(root)/_constants";
import AuthOptions from "@/components/UI/AuthOptions/AuthOptions";
import SegmentedControl from "@/components/UI/SegmentedControl/SegmentedControl";

const MainHeader = () => {
  return (
    <header className="relative flex justify-between items-center h-28 px-9">
      <h1 className="text-5xl font-semibold w-60 shrink-0">TEMIS</h1>
      <div className="w-full h-full flex justify-center items-center">
        <SegmentedControl items={mainCategories} />
      </div>
      <AuthOptions items={authLinks} />
    </header>
  );
};

export default MainHeader;
