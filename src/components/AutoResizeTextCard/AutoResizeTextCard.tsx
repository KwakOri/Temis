import AutoResizeText from "./AutoResizeText";

export default function FlexibleCard({ text }: { text: string }) {
  return (
    <div className="w-48 h-40 p-4 rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50 flex flex-col justify-between">
      <AutoResizeText 
        className="text-gray-500" 
        maxFontSize={14}
        padding={16}
      >
        공포게임
      </AutoResizeText>

      <AutoResizeText
        className="font-bold text-center"
        maxFontSize={20}
        minFontSize={12}
        padding={16}
        multiline={true}
        maxHeight={80}
      >
        {text}
      </AutoResizeText>

      <AutoResizeText 
        className="text-sm text-right" 
        maxFontSize={14}
        padding={16}
      >
        20:00
      </AutoResizeText>
    </div>
  );
}
