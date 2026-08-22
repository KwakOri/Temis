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
          style={{ ...CARD_SIZES.ONLINE, top: -10 }}
          className="relative flex justify-center items-center"
        >
          <div
            style={{
              height: 680,
              width: "70%",
              left: 48,
              top: 112,
            }}
            className="absolute flex justify-start items-start shrink-0 z-20"
          >
            <AutoResizeText
              style={{
                fontFamily: COMP_FONTS.ARTIST,
                color: BASE_COLORS.first.secondary,
                fontWeight: 700,
                lineHeight: 1.99,
              }}
              className="leading-none text-left"
              multiline={true}
              maxFontSize={50}
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
