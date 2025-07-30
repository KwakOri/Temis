import Image from "next/image";

interface TimeTableDesignGuideProps {
  id: string;
  opacity?: number;
}
const TimeTableDesignGuide = ({
  id,
  opacity = 0.8,
}: TimeTableDesignGuideProps) => {
  return (
    <Image
      style={{
        opacity: opacity,
      }}
      className="absolute inset-0 z-50"
      src={`/thumbnail/${id}.png`}
      alt={"도안"}
      fill
    />
  );
};

export default TimeTableDesignGuide;
