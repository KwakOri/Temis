import { queryKeys } from "@/lib/queryKeys";
import { AdminTemplateHubService } from "@/services/admin/templateHubService";
import type {
  TemplateHubListParams,
  TemplateSalesType,
} from "@/types/template-hub";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * mutation 후 Hub 목록 전체와 기존 admin template query를 다시 조회한다.
 *
 * 응답 item으로 목록을 부분 교체하지 않는다. 분류·판매 상태가 바뀌면 현재
 * 필터 결과에서 행이 빠지거나 facet 카운트가 달라지므로 서버 기준으로 다시
 * 받아야 화면이 실제 상태와 일치한다.
 */
const invalidateTemplateHubQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  templateId: string
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.templateHub() });
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.templateHubItem(templateId),
  });
  // 기존 관리 화면과 공용 상품 페이지가 같은 템플릿을 보고 있을 수 있다.
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates() });
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.template(templateId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.templatePlans(templateId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.templateArtists(templateId),
  });
};

export const useTemplateHubTemplates = (params?: TemplateHubListParams) =>
  useQuery({
    queryKey: queryKeys.admin.templateHubList(params),
    queryFn: () => AdminTemplateHubService.listTemplates(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    // 공용 상품 편집 페이지는 Hub가 아니라 기존 /admin/templates로 돌아가므로
    // (Beta 단계의 알려진 제약), 상품을 편집하고 Hub로 다시 들어왔을 때도
    // staleTime 안에서 오래된 상품 상태를 보여주지 않도록 매 mount마다
    // 다시 조회한다.
    refetchOnMount: "always",
  });

export const useUpdateTemplateSalesType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      salesType,
    }: {
      templateId: string;
      salesType: TemplateSalesType;
    }) => AdminTemplateHubService.updateSalesType(templateId, salesType),
    onSuccess: (_item, variables) => {
      invalidateTemplateHubQueries(queryClient, variables.templateId);
    },
  });
};

export const useUpdateTemplateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      visible,
    }: {
      templateId: string;
      visible: boolean;
    }) => AdminTemplateHubService.updateSale(templateId, visible),
    onSuccess: (_item, variables) => {
      invalidateTemplateHubQueries(queryClient, variables.templateId);
    },
  });
};
