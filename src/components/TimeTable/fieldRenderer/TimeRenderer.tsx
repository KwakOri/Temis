interface TimeRendererProps {
  value: string;
  onChange: (value: string) => void;
}

const TimeRenderer = ({ value, onChange }: TimeRendererProps) => {
  return (
    <input
      type="time"
      value={value}
      className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none"
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default TimeRenderer;
