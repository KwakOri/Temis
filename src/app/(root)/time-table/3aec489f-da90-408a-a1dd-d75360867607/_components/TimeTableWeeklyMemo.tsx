"use client";

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { Imgs as LocalImgs } from '../_img/imgs';
import { CARD_SIZES, COMP_FONTS } from '../_settings/settings';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TimeTableWeeklyMemo = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  const { isMemoTextVisible, memoText } = useTimeTableData();

  if (!isMemoTextVisible) return null;

  return (
    <div
      style={{
        ...CARD_SIZES.ONLINE,
      }}
      className="relative flex justify-center items-center"
    >
      <div
        style={{
          height: 460,
          width: 400,
          top: 285,
        }}
        className="absolute flex justify-center items-center shrink-0 "
      >
        <AutoResizeText
          style={{
            fontFamily: COMP_FONTS.MAIN_TITLE,
            color: '#6E3F46',
            lineHeight: 1.3,
          }}
          className="leading-none text-center"
          maxFontSize={56}
          multiline
        >
          {memoText}
        </AutoResizeText>
      </div>
      <img
        className="absolute inset-0 -z-10"
        src={Imgs['first']['weekly_memo'].src}
        alt={'weekly_memo'}
        draggable={false}
      />
    </div>
  );
};

export default TimeTableWeeklyMemo;
