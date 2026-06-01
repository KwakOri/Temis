import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { Imgs } from '../_img/imgs';
import { colors, fontOption } from '../_settings/settings';

const TeamTimeTableMemo = () => {
  const { memoText, isMemoTextVisible } = useTimeTableData();
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
        position: 'absolute',
        zIndex: 30,
      }}
      className="flex justify-center items-center"
    >
      {isMemoTextVisible && (
        <div
          className="absolute flex justify-start items-start z-30 "
          style={{ top: 1160, left: 220, width: 600, height: 220 }}
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.primary,
              color: colors.first.secondary,
              textAlign: 'start',
              lineHeight: 1.6,
            }}
            maxFontSize={36}
            multiline
          >
            {memoText}
          </AutoResizeText>
        </div>
      )}
      <img
        className={'absolute inset-0'}
        src={Imgs['first']['weekly_memo'].src}
        alt="memo"
        draggable={false}
      />
    </div>
  );
};

export default TeamTimeTableMemo;
