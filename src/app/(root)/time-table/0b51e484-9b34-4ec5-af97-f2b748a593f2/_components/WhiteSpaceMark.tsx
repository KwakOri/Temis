import { colors } from "../_settings/settings";
import { CellStyleProps, dayProps } from "./TimeTableCell";

interface WhiteSpaceMarkProps {
  day: number;
}

const WhiteSpaceMark = ({ day }: WhiteSpaceMarkProps) => {
  const textStyle: CellStyleProps = {
    0: { backgroundColor: colors["first"]["primary"] },
    1: { backgroundColor: colors["first"]["primary"] },
    2: { backgroundColor: colors["first"]["secondary"] },
    3: { backgroundColor: colors["first"]["secondary"] },
    4: { backgroundColor: colors["first"]["secondary"] },
    5: { backgroundColor: colors["first"]["secondary"] },
    6: { backgroundColor: colors["first"]["secondary"] },
  };

  return (
    <div className="w-12 h-12 flex items-center justify-center">
      <div className="grid grid-cols-2 gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            ...textStyle[day as dayProps],
          }}
        ></div>
        <div
          className="w-2 h-2 rounded-full"
          style={{
            ...textStyle[day as dayProps],
          }}
        ></div>
        <div
          className="w-2 h-2 rounded-full"
          style={{
            ...textStyle[day as dayProps],
          }}
        ></div>
        <div
          className="w-2 h-2 rounded-full"
          style={{
            ...textStyle[day as dayProps],
          }}
        ></div>
      </div>
    </div>
  );
};

export default WhiteSpaceMark;
