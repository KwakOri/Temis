import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { Imgs } from '../_img/imgs';
import { COMP_COLORS, COMP_FONTS } from '../_settings/settings';

interface TimeTableMemoProps {
  isMemo: boolean;
  memoText: string;
  weekDates: Date[];
}

const TimeTableMemo = ({ weekDates, isMemo, memoText }: TimeTableMemoProps) => {
  const { start, end } = getWeekDateRange(weekDates);
  return (
    <>
      <div
        style={{
          width: 2336,
          height: 952,
          rotate: '4deg',
          top: 1812,
          left: 228,
        }}
        className="absolute z-20 flex justify-center items-center bg-black/30"
      >
        <div
          className="flex justify-center absolute z-20"
          style={{ right: 70, top: 90, width: 1000, height: 300 }}
        >
          <p
            style={{
              top: 48,
              fontSize: 48,
              fontFamily: COMP_FONTS.WEEKLY_FLAG,
              color: COMP_COLORS.TEXT_A,
            }}
            className="absolute"
          >
            {start.year}/{padZero(start.month)}/{padZero(start.date)} ~{' '}
            {end.year}/{padZero(end.month)}/{padZero(end.date)}
          </p>
          <p
            style={{
              top: 88,
              fontSize: 128,
              fontFamily: COMP_FONTS.WEEKLY_FLAG,
              color: COMP_COLORS.TEXT_A,
            }}
            className="absolute"
          >
            {isMemo ? '이번 주 메모' : '이번 주 일정'}
          </p>
        </div>
        {isMemo ? (
          <div
            className="absolute z-20 "
            style={{ width: 1150, height: 400, top: 88, left: 70 }}
          >
            <AutoResizeText
              style={{ fontFamily: COMP_FONTS.WEEKLY_MEMO, color: '#383B68' }}
              maxFontSize={64}
              multiline
            >
              {memoText || '메모를 입력해 주세요'}
            </AutoResizeText>
          </div>
        ) : (
          <img
            style={{
              width: 2305,
              height: 922,
              left: 30,
              top: 10,
            }}
            className="absolute z-10"
            src={Imgs['first']['memo_dummy'].src}
          />
        )}
        <img className="absolute inset-0" src={Imgs['first']['memo'].src} />
      </div>
    </>
  );
};

export default TimeTableMemo;
