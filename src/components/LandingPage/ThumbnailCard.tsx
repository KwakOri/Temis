import Image from "next/image";

type Props = { id: number };

const ThumbnailCard = ({ id }: Props) => (
  <div className="relative group">
    {/* 썸네일 카드 */}
    <div className="w-[300px] h-[200px] aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md hover-card">
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
