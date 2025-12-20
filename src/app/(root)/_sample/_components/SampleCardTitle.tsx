interface SampleCardTitleProps {
  label: string;
}

const SampleCardTitle = ({ label }: SampleCardTitleProps) => {
  return (
    <p
      style={{ letterSpacing: -2 }}
      className="pl-3 font-semibold text-2xl text-[#1B1612]"
    >
      {label}
    </p>
  );
};

export default SampleCardTitle;
