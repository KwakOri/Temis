"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState, type ImgHTMLAttributes } from "react";
import { useManagedCatalogUrl } from "@/hooks/query/useLegacyTemplateAssets";
import { requiresCatalogCoverR2 } from "@/utils/legacy-template-assets/source-policy";

export function ManagedCatalogImage({
  src,
  alt,
  onError,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string }) {
  const managed = useManagedCatalogUrl(src);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [managed.src]);
  if (managed.error)
    return (
      <span role="alert" className="text-xs text-red-700">
        {managed.error.message}
      </span>
    );
  if (managed.isLoading)
    return (
      <span role="status" className="text-xs text-dark-gray/50">
        대표 이미지 불러오는 중...
      </span>
    );
  if (failed && requiresCatalogCoverR2(src))
    return (
      <span role="alert" className="text-xs text-red-700">
        R2 대표 이미지를 표시하지 못했습니다.
      </span>
    );
  return (
    <img
      key={managed.src}
      {...props}
      src={managed.src ?? undefined}
      alt={alt ?? ""}
      onError={(event) => {
        if (requiresCatalogCoverR2(src)) setFailed(true);
        else onError?.(event);
      }}
    />
  );
}
