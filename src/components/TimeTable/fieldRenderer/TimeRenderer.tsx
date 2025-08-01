interface TimeRendererProps {
  value: string;
  onChange: (value: string) => void;
  id: string;
}

const TimeRenderer = ({ id, value, onChange }: TimeRendererProps) => {
  return (
    <label htmlFor={`${id}-time`}>
      <input
        id={`${id}-time`}
        type="time"
        value={value}
        className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
};

export default TimeRenderer;
