"use client";

import Image from "next/image";
import React from "react";

interface TimeTableDesignGuideProps {
  id: string;
  isVisible: boolean;
  opacity: number;
  className?: string;
}

const TimeTableDesignGuide: React.FC<TimeTableDesignGuideProps> = ({
  id,
  isVisible,
  opacity,
  className = "",
}) => {
  if (!isVisible) return null;

  return (
    <Image
      style={{
        opacity: opacity,
      }}
      className={`absolute inset-0 z-40 pointer-events-none ${className}`}
      src={`/thumbnail/${id}.png`}
      alt="도안 가이드"
      fill
      priority={false}
      unoptimized={true}
    />
  );
};

export default TimeTableDesignGuide;
