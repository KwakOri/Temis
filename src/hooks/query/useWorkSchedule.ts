import { queryKeys } from "@/lib/queryKeys";
import { WorkScheduleService } from "@/services/workScheduleService";
import { useQuery } from "@tanstack/react-query";

export const useWorkSchedule = () => {
  return useQuery({
    queryKey: queryKeys.workSchedule.orders(),
    queryFn: WorkScheduleService.getWorkSchedule,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
