"use client";

import { useTimeTableDesignGuideContext } from "@/contexts/TimeTableDesignGuideContext";
import Image from "next/image";
import { usePathname } from "next/navigation";
import React from "react";

interface TimeTableDesignGuideProps {
  className?: string;
}

const TimeTableDesignGuide: React.FC<TimeTableDesignGuideProps> = ({
  className = "",
}) => {
  const { isVisible, opacity } = useTimeTableDesignGuideContext();

  const pathname = usePathname();

  const segments = pathname?.split("/").filter(Boolean);
  const id = segments?.[segments.length - 1]; // 마지막 세그먼트

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
