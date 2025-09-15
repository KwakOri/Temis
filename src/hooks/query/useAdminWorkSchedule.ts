import { queryKeys } from "@/lib/queryKeys";
import { AdminWorkScheduleService } from "@/services/admin/workScheduleService";
import { useQuery } from "@tanstack/react-query";

export const useAdminWorkSchedule = () => {
  return useQuery({
    queryKey: queryKeys.admin.workSchedule(),
    queryFn: () => AdminWorkScheduleService.getWorkSchedule(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
