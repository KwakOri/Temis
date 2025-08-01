import AdaptiveTimeRenderer from './AdaptiveTimeRenderer';

interface TimeRendererProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

const TimeRenderer = ({ value, onChange, id }: TimeRendererProps) => {
  return (
    <AdaptiveTimeRenderer 
      value={value} 
      onChange={onChange} 
      id={id}
    />
  );
};

export default TimeRenderer;
