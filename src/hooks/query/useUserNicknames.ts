import { useQuery } from "@tanstack/react-query";

export interface UserNickname {
  id: number;
  name: string | null;
}

interface UserNicknamesResponse {
  users: UserNickname[];
  userIds: number[];
}

const USER_NICKNAME_QUERY_KEYS = {
  all: ["users", "nicknames"] as const,
  byIds: (userIds: number[]) =>
    [...USER_NICKNAME_QUERY_KEYS.all, { userIds }] as const,
};

async function getUserNicknames(userIds: number[]): Promise<UserNicknamesResponse> {
  const params = new URLSearchParams({
    user_ids: userIds.join(","),
  });

  const response = await fetch(`/api/users/nicknames?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "닉네임 조회에 실패했습니다.");
  }

  const data = await response.json();

  return {
    users: data.users || [],
    userIds: data.userIds || userIds,
  };
}

export function useUserNicknames(userIds: number[], enabled = true) {
  return useQuery<UserNicknamesResponse, Error>({
    queryKey: USER_NICKNAME_QUERY_KEYS.byIds(userIds),
    queryFn: () => getUserNicknames(userIds),
    enabled: enabled && userIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
