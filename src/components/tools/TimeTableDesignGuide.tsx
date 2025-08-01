"use client";

import { useTimeTableDesignGuideContext } from "@/contexts/TimeTableDesignGuideContext";
import Image from "next/image";
import React from "react";

interface TimeTableDesignGuideProps {
  id: string;
  className?: string;
}

const TimeTableDesignGuide: React.FC<TimeTableDesignGuideProps> = ({
  id,
  className = "",
}) => {
  const { isVisible, opacity } = useTimeTableDesignGuideContext();

  if (!isVisible) return null;

  return (
    <Image
      style={{
        opacity: opacity,
      }}
      className={`absolute inset-0 z-50 pointer-events-none ${className}`}
      src={`/thumbnail/${id}.png`}
      alt="도안 가이드"
      fill
      priority={false}
      unoptimized={true}
    />
  );
};

export default TimeTableDesignGuide;
