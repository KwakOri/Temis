import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
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
          className="absolute flex justify-center items-center bg-black/30"
          style={{ top: 1848, width: 3600, height: 212 }}
        >
          <AutoResizeText
            style={{
              fontFamily: fontOption.primary,
              color: colors.first.primary,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
            maxFontSize={92}
            multiline
          >
            {memoText}
          </AutoResizeText>
        </div>
      )}
    </div>
  );
};

export default TeamTimeTableMemo;
