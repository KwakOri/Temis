"use client";
import { useAuth } from "@/contexts/AuthContext";
import { LegacyTemplateAssetService as service } from "@/services/legacyTemplateAssetService";
import type {
  LegacyAssetChange,
  LegacyAssetOwner,
} from "@/types/legacy-template-assets";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export const legacyAssetQueryKeys = {
  all: ["legacy-template-assets"] as const,
  list: (userId: string) => ["legacy-template-assets", userId, "list"] as const,
  detail: (userId: string, owner: LegacyAssetOwner) =>
    [
      "legacy-template-assets",
      userId,
      "detail",
      owner.ownerKind,
      owner.templateId,
      owner.purpose ?? "runtime",
    ] as const,
  runtime: (userId: string, owner: LegacyAssetOwner) =>
    [
      "legacy-template-assets",
      userId,
      "runtime",
      owner.ownerKind,
      owner.templateId,
      owner.purpose ?? "runtime",
    ] as const,
};
export function useProjectAssetManifest(
  enabled = process.env.NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED === "true",
) {
  return useQuery({
    queryKey: ["legacy-template-assets", "public-project-manifest"],
    queryFn: service.projectManifest,
    enabled,
    staleTime: 0,
    retry: false,
  });
}
export function useManagedCatalogUrl(src: string | null | undefined) {
  const enabled =
    process.env.NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED === "true" &&
    !!src &&
    /^\/(?:thumbnail|team-thumbnails)\/[a-f0-9-]{36}\.png$/i.test(src);
  const query = useProjectAssetManifest(enabled);
  return {
    src: enabled && src ? (query.data?.covers[src]?.src ?? src) : src,
    error: enabled ? query.error : null,
  };
}
function useAssetIdentity() {
  const { user, loading } = useAuth();
  const client = useQueryClient();
  const previous = useRef(user?.id);
  useEffect(() => {
    if (previous.current && previous.current !== user?.id)
      client.removeQueries({
        queryKey: ["legacy-template-assets", previous.current],
      });
    previous.current = user?.id;
  }, [client, user?.id]);
  return {
    userId: user?.id ?? "anonymous",
    isAdmin: !loading && !!user?.isAdmin,
    enabled: !loading && !!user,
  };
}
export function useLegacyAssetSets() {
  const identity = useAssetIdentity();
  return useQuery({
    queryKey: legacyAssetQueryKeys.list(identity.userId),
    queryFn: service.list,
    enabled: identity.isAdmin,
    staleTime: 0,
  });
}
export function useLegacyAssetDetail(owner: LegacyAssetOwner) {
  const identity = useAssetIdentity();
  return useQuery({
    queryKey: legacyAssetQueryKeys.detail(identity.userId, owner),
    queryFn: () => service.detail(owner),
    enabled: identity.isAdmin,
    staleTime: 0,
  });
}
export function useLegacyAssetMutations(owner: LegacyAssetOwner) {
  const client = useQueryClient();
  const invalidate = () =>
    client.invalidateQueries({ queryKey: legacyAssetQueryKeys.all });
  return {
    upload: useMutation({
      mutationFn: ({ assetId, file }: { assetId: string; file: File }) =>
        service.upload(owner, assetId, file),
      onSuccess: invalidate,
    }),
    apply: useMutation({
      mutationFn: ({
        expectedRevisionId,
        changes,
        note,
      }: {
        expectedRevisionId: string | null;
        changes: LegacyAssetChange[];
        note: string;
      }) => service.apply(owner, expectedRevisionId, changes, note),
      onSuccess: invalidate,
    }),
    restore: useMutation({
      mutationFn: ({
        expectedRevisionId,
        revisionId,
      }: {
        expectedRevisionId: string | null;
        revisionId: string;
      }) => service.restore(owner, expectedRevisionId, revisionId),
      onSuccess: invalidate,
    }),
    mode: useMutation({
      mutationFn: ({
        expectedRevisionId,
        mode,
      }: {
        expectedRevisionId: string | null;
        mode: "local" | "r2";
      }) => service.mode(owner, expectedRevisionId, mode),
      onSuccess: invalidate,
    }),
  };
}
export function useLegacyAssetRuntime(
  owner: LegacyAssetOwner,
  enabled: boolean,
) {
  const identity = useAssetIdentity();
  return useQuery({
    queryKey: legacyAssetQueryKeys.runtime(identity.userId, owner),
    queryFn: () => service.runtime(owner),
    enabled: (identity.enabled || owner.ownerKind === "thumbnail") && enabled,
    staleTime: 0,
    retry: false,
  });
}
export function useLegacyAssetPreview(
  owner: LegacyAssetOwner,
  changes: LegacyAssetChange[] | null,
) {
  const identity = useAssetIdentity();
  return useQuery({
    queryKey: [
      "legacy-template-assets",
      identity.userId,
      "preview",
      owner.ownerKind,
      owner.templateId,
      owner.purpose ?? "runtime",
      changes,
    ],
    queryFn: () => service.preview(owner, changes!),
    enabled: !!changes && identity.isAdmin,
    staleTime: 0,
    retry: false,
  });
}
