"use client";

import { Portfolio } from "@/types/portfolio";
import Link from "next/link";

interface GalleryItemProps {
  portfolio: Portfolio;
  cardWidth?: number;
  cardHeight?: number;
}

const GalleryItem = ({
  portfolio,
  cardWidth = 300,
  cardHeight = Math.round((300 / 16) * 9),
}: GalleryItemProps) => {
  return (
    <Link href={`/portfolio/${portfolio.id}`} className="relative group">
      <div
        className="rounded-xl overflow-hidden bg-gray-100 shadow-md hover-card transition-all duration-300"
        style={{
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
        }}
      >
        <img
          src={portfolio.thumbnail_url}
          alt={portfolio.title}
          className="w-full h-full object-cover"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>
    </Link>
  );
};

export default GalleryItem;
