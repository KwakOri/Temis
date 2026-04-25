import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { Imgs } from '../_img/imgs';
import { BASE_COLORS, COMP_FONTS } from '../_settings/settings';

const TimeTableWeeklyMemo = () => {
  const { isMemoTextVisible, memoText } = useTimeTableData();

  return (
    <>
      <div
        style={{ width: 1020, height: 338, left: 2732, top: 1748 }}
        className="absolute flex justify-center items-center z-50"
      >
        {isMemoTextVisible && (
          <div
            style={{
              height: 200,
              width: '70%',
              top: 80,
            }}
            className="absolute flex justify-center items-center shrink-0"
          >
            <AutoResizeText
              style={{
                fontFamily: COMP_FONTS.MAIN_TITLE,
                color: BASE_COLORS.first.primary,
                letterSpacing: -2,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
              className="leading-none text-center"
              multiline={true}
              maxFontSize={72}
            >
              {memoText || '메모 내용을\n적어주세요'}
            </AutoResizeText>
          </div>
        )}
        <img
          className="object-cover w-full h-full"
          src={Imgs['first']['memo'].src.replace('./', '/')}
          draggable={false}
          alt="memo"
        />
      </div>
    </>
  );
};

export default TimeTableWeeklyMemo;
