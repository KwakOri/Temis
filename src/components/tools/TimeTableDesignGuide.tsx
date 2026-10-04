"use client";

import { useTimeTableDesignGuideContext } from "@/contexts/TimeTableDesignGuideContext";
import { ManagedCatalogImage } from "@/components/common/ManagedCatalogImage";
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
    <ManagedCatalogImage
      style={{
        opacity: opacity,
      }}
      className={`absolute inset-0 h-full w-full z-50 pointer-events-none ${className}`}
      src={`/thumbnail/${id}.png`}
      alt="도안 가이드"
    />
  );
};

export default TimeTableDesignGuide;
