"use client";
/* eslint-disable @next/next/no-img-element */
import React, { type ImgHTMLAttributes } from "react";
import { useManagedCatalogUrl } from "@/hooks/query/useLegacyTemplateAssets";

export function ManagedCatalogImage({
  src,
  alt,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string }) {
  const managed = useManagedCatalogUrl(src);
  if (managed.error)
    return (
      <span role="alert" className="text-xs text-red-700">
        {managed.error.message}
      </span>
    );
  return (
    <img
      key={managed.src}
      {...props}
      src={managed.src ?? undefined}
      alt={alt ?? ""}
    />
  );
}
