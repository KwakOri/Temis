import { AutoResizeText } from "@/components/AutoResizeTextCard";
import {
  BASE_COLORS,
  CARD_SIZES,
  COMP_COLORS,
  COMP_FONTS,
} from "../_settings/settings";
import { Imgs } from "../_img/imgs";
import { useTimeTableData } from "@/contexts/TimeTableContext";

const WeeklyMemoCard = () => {
  const { isMemoTextVisible, memoText } = useTimeTableData();

  return (
    <>
      {isMemoTextVisible && (
        <div
          style={{}}
          className="absolute inset-0 flex justify-center items-center z-20"
        >
          <div
            style={{
              height: 880,
              width: 800,
              left: 3140,
              top: 1332,
              rotate: "-2.6deg",
            }}
            className="absolute flex justify-start items-start shrink-0 z-20"
          >
            <AutoResizeText
              style={{
                fontFamily: COMP_FONTS.ARTIST,
                color: "#274198",
                fontWeight: 500,
                lineHeight: 2.35,
              }}
              className="leading-none text-left"
              multiline={true}
              maxFontSize={60}
            >
              {memoText || "메모 내용을\n적어주세요"}
            </AutoResizeText>
          </div>
          <img
            className="absolute inset-0 z-10"
            src={Imgs["first"]["weekly_memo"].src.replace("./", "/")}
            alt="memo"
          />
        </div>
      )}
    </>
  );
};

export default WeeklyMemoCard;
