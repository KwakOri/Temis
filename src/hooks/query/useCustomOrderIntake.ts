import { queryKeys } from "@/lib/queryKeys";
import { getCustomOrderIntake } from "@/services/customOrderIntakeService";
import { useQuery } from "@tanstack/react-query";

export function useCustomOrderIntake(kind: "timetable" | "thumbnail") {
  const query = useQuery({
    queryKey: queryKeys.customOrder.intake(),
    queryFn: getCustomOrderIntake,
    staleTime: 0,
    refetchInterval: 30 * 1000,
  });
  const accepting = !query.isError && Boolean(query.data?.[kind].accepting);
  const status = query.isLoading
    ? "접수 상태 확인 중"
    : query.isError
      ? "접수 상태 확인 실패"
      : accepting
        ? "신청 가능"
        : "접수 마감";

  return { ...query, accepting, status, message: query.data?.[kind].message };
}
