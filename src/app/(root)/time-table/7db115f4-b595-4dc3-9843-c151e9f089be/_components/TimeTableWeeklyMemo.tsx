import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { Imgs } from '../_img/imgs';
import { COMP_FONTS } from '../_settings/settings';

const TimeTableWeeklyMemo = () => {
  const { isMemoTextVisible, memoText } = useTimeTableData();

  return (
    <>
      {isMemoTextVisible && (
        <div
          className="absolute z-20"
          style={{ width: 900, height: 700, top: 480, left: 1872 }}
        >
          <div
            className=" flex justify-center items-start absolute z-10"
            style={{
              width: 600,
              height: 500,
              top: 132,
              left: 148,
            }}
          >
            <AutoResizeText
              maxFontSize={84}
              multiline
              style={{
                fontFamily: COMP_FONTS.WEEKLY_MEMO,
                color: '#1D56AD',
                lineHeight: 1.4,
              }}
              className="text-center"
            >
              {memoText}
            </AutoResizeText>
          </div>
          <img
            className="w-full h-full object-cover"
            src={Imgs['first']['weeklyMemo'].src}
            draggable={false}
          />
        </div>
      )}
    </>
  );
};

export default TimeTableWeeklyMemo;
