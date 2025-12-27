import { AutoResizeText } from "@/components/AutoResizeTextCard";
import { Imgs } from "../_img/imgs";
import { colors, fontOption } from "../_settings/settings";

interface TimeTableMemoProps {
  isMemoTextVisible: boolean;
  memoText: string;
}

const TimeTableMemo = ({ isMemoTextVisible, memoText }: TimeTableMemoProps) => {
  return (
    <>
      {isMemoTextVisible && (
        <div
          style={{
            width: 718,
            height: 684,
            position: "absolute",
            zIndex: 30,
            top: 308,
            left: 268,
          }}
        >
          <p
            style={{
              fontSize: 64,
              fontWeight: 800,
              fontFamily: fontOption.primary,
              color: colors["first"]["primary"],
              position: "absolute",
              right: 24,
              top: 14,
            }}
          >
            MEMO
          </p>
          <div
            className="absolute flex justify-end items-start"
            style={{ width: 580, height: 450, right: 24, top: 120 }}
          >
            <AutoResizeText
              style={{
                fontFamily: fontOption.primary,
                fontWeight: 600,
                textAlign: "right",
                color: colors["first"]["primary"],
                lineHeight: 1,
              }}
              multiline={true}
              maxFontSize={100}
            >
              {memoText || "주간 메모\n적는 곳"}
            </AutoResizeText>
          </div>
          <img src={Imgs["first"]["memo"].src} alt={"memo"} draggable={false} />
        </div>
      )}
    </>
  );
};

export default TimeTableMemo;
