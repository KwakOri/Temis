import Image from "next/image";

type Props = { id: number };

const ThumbnailCard = ({ id }: Props) => (
  <div className="relative group transition duration-300">
    {/* 썸네일 카드 */}
    <div className="w-[300px] h-[200px] aspect-square pointer-events-none rounded-xl overflow-hidden bg-gray-100 shadow-md group-hover:z-50 group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300">
      <Image
        src={`/img/landingpage/${id}.png`}
        alt={`작업물 ${id}`}
        className="w-full h-full object-cover"
        width={300}
        height={200}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  </div>
);

export default ThumbnailCard;
