import { queryKeys } from "@/lib/queryKeys";
import { AdminEmailService } from "@/services/admin/emailService";
import { SendTestEmailData } from "@/types/admin";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useEmailConnectionTest = () => {
  return useQuery({
    queryKey: queryKeys.admin.emailTest(),
    queryFn: () => AdminEmailService.testConnection(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSendTestEmail = () => {
  return useMutation({
    mutationFn: (data: SendTestEmailData) =>
      AdminEmailService.sendTestEmail(data),
  });
};
