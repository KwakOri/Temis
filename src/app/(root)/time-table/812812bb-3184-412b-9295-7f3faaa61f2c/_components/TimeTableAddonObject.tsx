import { AutoResizeText } from "@/components/AutoResizeTextCard";
import { TAddonData } from "@/components/TimeTable/FixedComponents/TimeTableAddonList";
import { createPlaceholdersFromAddonFields } from "@/utils/time-table/data";
import { addonFields, colors, fontOption } from "../_settings/settings";

const addonPlaceholders = createPlaceholdersFromAddonFields(addonFields);

interface TimeTableAddonObjectProps {
  addonData: TAddonData;
}

const TimeTableAddonObject = ({ addonData }: TimeTableAddonObjectProps) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"].quaternary,
      }}
      className="absolute inset-0 z-20"
    >
      <div
        className="absolute flex justify-center items-center"
        style={{
          width: 516,
          height: 320,
          top: 565,
          left: 3156,
        }}
      >
        <p
          style={{ fontSize: 64, color: "#3E556A" }}
          className="absolute -top-54"
        >
          {addonData.addon_01_label === "option_01" ? "이번주 급훈" : "D-DAY"}
        </p>
        <AutoResizeText
          maxFontSize={76}
          multiline={true}
          className="text-center"
          style={{ lineHeight: 1.2, color: colors["first"].quaternary }}
        >
          {(addonData.addon_01 as string)
            ? (addonData.addon_01 as string)
            : addonPlaceholders.addon_01}
        </AutoResizeText>
      </div>
      <div
        className="absolute flex justify-center items-center"
        style={{
          width: 516,
          height: 500,
          top: 1248,
          left: 3156,
        }}
      >
        <p
          style={{ fontSize: 64, color: "#3E556A" }}
          className="absolute -top-58"
        >
          이번주 공지사항
        </p>
        <AutoResizeText
          maxFontSize={76}
          multiline={true}
          className="text-center"
          style={{ lineHeight: 1.2, color: colors["first"].quaternary }}
        >
          {(addonData.addon_02 as string)
            ? (addonData.addon_02 as string)
            : addonPlaceholders.addon_02}
        </AutoResizeText>
      </div>
    </div>
  );
};

export default TimeTableAddonObject;
