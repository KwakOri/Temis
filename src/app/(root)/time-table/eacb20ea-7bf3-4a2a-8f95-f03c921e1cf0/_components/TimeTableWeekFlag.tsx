import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { TTheme } from '@/types/time-table/theme';
import { Imgs } from '../_img/imgs';
import { COMP_FONTS } from '../_settings/settings';

interface TimeTableWeekFlagProps {
  currentTheme: TTheme;
  weekDates: Date[];
}
// left -11.3 right 7.5 180/230

const TimeTableWeekFlag = ({
  currentTheme,
  weekDates,
}: TimeTableWeekFlagProps) => {
  const { isMemoTextVisible, memoText } = useTimeTableData();

  return (
    <>
      {isMemoTextVisible && (
        <div
          className="absolute z-20"
          style={{ width: 647, height: 870, top: 810, left: 2220 }}
        >
          <div
            className=" flex justify-center items-center absolute z-10"
            style={{
              width: 420,
              height: 480,
              top: 260,
              left: 148,
            }}
          >
            <AutoResizeText
              maxFontSize={80}
              multiline
              style={{ fontFamily: COMP_FONTS.WEEKLY_MEMO, color: '#EAFFFE' }}
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

export default TimeTableWeekFlag;
