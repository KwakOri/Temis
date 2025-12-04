"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

interface UseTeamTemplateAccessProps {
  templateId: string;
}

interface UseTeamTemplateAccessResult {
  hasAccess: boolean | null; // null = loading
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  reason:
    | "admin_access"
    | "team_member_access"
    | "no_team_connected"
    | "not_team_member"
    | "no_access"
    | null;
}

export function useTeamTemplateAccess({
  templateId,
}: UseTeamTemplateAccessProps): UseTeamTemplateAccessResult {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reason, setReason] = useState<
    | "admin_access"
    | "team_member_access"
    | "no_team_connected"
    | "not_team_member"
    | "no_access"
    | null
  >(null);

  useEffect(() => {
    async function checkAccess() {
      // 클라이언트 사이드에서만 실행
      if (typeof window === "undefined") {
        return;
      }

      if (!user || !templateId) {
        // 사용자나 templateId가 없을 때는 로딩 상태 유지
        setLoading(true);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/team-template-access?templateId=${encodeURIComponent(templateId)}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();

        setHasAccess(data.hasAccess);
        setIsAdmin(data.isAdmin);
        setReason(data.reason);
      } catch (err) {
        console.error("Error checking team template access:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to check team template access"
        );
        setHasAccess(false);
        setIsAdmin(false);
        setReason("no_access");
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [user, templateId]);

  return {
    hasAccess,
    loading,
    error,
    isAdmin,
    reason,
  };
}
