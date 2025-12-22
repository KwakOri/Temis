import { SizeProps } from "@/utils/utils";
import AdaptiveTimeRenderer from "./AdaptiveTimeRenderer";

interface TimeRendererProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  height: SizeProps;
}

const TimeRenderer = ({ height, value, onChange, id }: TimeRendererProps) => {
  return (
    <AdaptiveTimeRenderer
      height={height}
      value={value}
      onChange={onChange}
      id={id}
    />
  );
};

export default TimeRenderer;
