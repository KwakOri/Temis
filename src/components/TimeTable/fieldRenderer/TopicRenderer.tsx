interface TopicRendererProps {
  value: string;
  placeholder: string;
  handleTopicChange: (value: string) => void;
}

const TopicRenderer = ({
  value,
  placeholder,
  handleTopicChange,
}: TopicRendererProps) => {
  return (
    <input
      value={value as string}
      placeholder={placeholder}
      className="w-full bg-gray-100 rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none"
      onChange={(e) => handleTopicChange(e.target.value)}
    />
  );
};

export default TopicRenderer;
