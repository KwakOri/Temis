"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { ConsumerTemplateKind } from "@/utils/templates/consumer-template";

export interface TemplateCoverProps {
  src: string | null;
  alt: string;
  kind: ConsumerTemplateKind;
  className?: string;
  imageClassName?: string;
}

const placeholderLabel = (kind: ConsumerTemplateKind) =>
  kind === "timetable" ? "시간표 이미지 없음" : "썸네일 이미지 없음";

export function TemplateCover({
  src,
  alt,
  kind,
  className,
  imageClassName,
}: TemplateCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !imageFailed;

  return (
    <div
      className={cn(
        "relative flex min-h-32 items-center justify-center overflow-hidden bg-timetable-input-bg",
        className,
      )}
      role="img"
      aria-label={`${alt} 대표 이미지`}
      data-template-cover-kind={kind}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 text-center text-dark-gray/50">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full border border-current text-xs font-semibold"
            aria-hidden="true"
          >
            {kind === "timetable" ? "표" : "PNG"}
          </span>
          <span className="text-xs">{placeholderLabel(kind)}</span>
        </div>
      )}
    </div>
  );
}
