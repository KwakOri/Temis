interface TimeRendererProps {
  handleHourChange: (hour: number) => void;
  handleMinuteChange: (minute: number) => void;
  hour: number;
  minute: number;
}

const TimeRenderer = ({
  handleHourChange,
  handleMinuteChange,
  hour,
  minute,
}: TimeRendererProps) => {
  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1">
        <input
          type="number"
          min="0"
          max="24"
          value={hour}
          className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none text-center"
          placeholder="시"
          onChange={(e) => handleHourChange(parseInt(e.target.value) || 0)}
        />
      </div>
      <span className="text-gray-500 font-semibold">:</span>
      <div className="flex-1">
        <input
          type="number"
          min="0"
          max="60"
          step="5"
          value={minute}
          className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none text-center"
          placeholder="분"
          onChange={(e) => handleMinuteChange(parseInt(e.target.value) || 0)}
        />
      </div>
    </div>
  );
};

export default TimeRenderer;
