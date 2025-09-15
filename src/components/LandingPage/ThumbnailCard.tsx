import Image from "next/image";

interface ThumbnailCardProps {
  id: number;
  cardWidth?: number;
  cardHeight?: number;
}

const ThumbnailCard = ({ id, cardWidth = 300, cardHeight = Math.round(300 / 16 * 9) }: ThumbnailCardProps) => (
  <div className="relative group">
    {/* 썸네일 카드 */}
    <div 
      className="rounded-xl overflow-hidden bg-gray-100 shadow-md hover-card transition-all duration-300"
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
      }}
    >
      <Image
        src={`/img/landing_page/thumbnail/${id}.png`}
        alt={`작업물 ${id}`}
        className="w-full h-full object-cover"
        width={cardWidth}
        height={cardHeight}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  </div>
);

export default ThumbnailCard;
