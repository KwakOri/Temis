import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { getWeekDateRange } from '@/utils/date-formatter';
import { Imgs } from '../_img/imgs';
import { fontOption } from '../_settings/settings';

const TeamTimeTableMemo = () => {
  const { memoText, isMemoTextVisible } = useTimeTableData();
  const { weekDates } = useTimeTableData();

  const { start, end } = getWeekDateRange(weekDates);
  const weekTime = Math.ceil(start.date / 7);
  return (
    <div
      style={{
        width: 488,
        height: 780,
      }}
      className="flex justify-center items-center relative"
    >
      {isMemoTextVisible && (
        <>
          <p
            className="absolute z-30"
            style={{
              fontFamily: fontOption.tertiary,
              fontSize: 20,
              color: '#F33049',
              top: 86,
              left: 304,
              letterSpacing: 2,
            }}
          >
            {start.month}월 {weekTime}주차_
          </p>
          <div
            className="absolute flex justify-start items-start z-30"
            style={{ top: 160, width: 420, height: 560 }}
          >
            <AutoResizeText
              style={{
                fontFamily: fontOption.primary,
                color: '#CCCCCC',
                textAlign: 'start',
                lineHeight: 1.6,
              }}
              maxFontSize={52}
              multiline
            >
              {memoText}
            </AutoResizeText>
          </div>
          <img
            className={'absolute inset-0'}
            src={Imgs['first']['weekly_memo'].src}
            alt="memo"
            draggable={false}
          />
        </>
      )}
    </div>
  );
};

export default TeamTimeTableMemo;
