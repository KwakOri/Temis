import { queryKeys } from "@/lib/queryKeys";
import { V2TemplateService } from "@/services/v2_template_service";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useV2Templates = (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.template.v2Templates(params),
    queryFn: () => V2TemplateService.getTemplates(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
