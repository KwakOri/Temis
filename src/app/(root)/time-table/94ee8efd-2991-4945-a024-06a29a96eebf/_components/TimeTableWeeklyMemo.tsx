import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { Imgs } from '../_img/imgs';
import { COMP_FONTS } from '../_settings/settings';

const TimeTableWeeklyMemo = () => {
  const { isMemoTextVisible, memoText } = useTimeTableData();

  return (
    <>
      {isMemoTextVisible && (
        <>
          <div className="absolute inset-0 flex justify-center items-center z-30">
            <div
              style={{
                height: 220,
                width: 1060,
                left: 1680,
                top: 1974,
              }}
              className="absolute flex justify-start items-start shrink-0 "
            >
              <AutoResizeText
                style={{
                  fontFamily: COMP_FONTS.WEEKLY_MEMO,
                  color: '#24BBC8',
                  lineHeight: 1.7,
                  fontWeight: 400,
                  letterSpacing: 2,
                }}
                className="leading-none text-left"
                multiline={true}
                maxFontSize={40}
              >
                {memoText || '이번주 한마디\n작성하시는 곳'}
              </AutoResizeText>
            </div>

            <img
              className="object-cover w-full h-full"
              src={Imgs['first']['memo'].src.replace('./', '/')}
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
