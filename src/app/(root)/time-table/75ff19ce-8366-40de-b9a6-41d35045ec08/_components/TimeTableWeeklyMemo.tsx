"use client";

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { Imgs as LocalImgs } from '../_img/imgs';
import { COMP_FONTS } from '../_settings/settings';
import { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";

const TimeTableWeeklyMemo = () => {
  const Imgs = useLegacyTemplateImages(LocalImgs);
  const { isMemoTextVisible, memoText } = useTimeTableData();

  return (
    <>
      {isMemoTextVisible && (
        <>
          <div className="absolute inset-0 flex justify-center items-center z-40">
            <div
              style={{
                height: 120,
                width: 240,
                left: 1572,
                top: 816,
              }}
              className="absolute flex justify-center items-center shrink-0"
            >
              <AutoResizeText
                style={{
                  fontFamily: COMP_FONTS.MAIN_TITLE,
                  color: '#CACACA',
                  lineHeight: 1.1,
                  fontWeight: 400,
                  letterSpacing: 2,
                }}
                className="leading-none text-center"
                multiline={true}
                maxFontSize={36}
              >
                {memoText || '이번주 한마디\n작성하시는 곳'}
              </AutoResizeText>
            </div>

            <img
              className="object-cover w-full h-full"
              src={Imgs['first']['memo'].src}
              draggable={false}
              alt="memo"
            />
          </div>
        </>
      )}
    </>
  );
};

export default TimeTableWeeklyMemo;
