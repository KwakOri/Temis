import { queryKeys } from "@/lib/queryKeys";
import { AdminOptionService } from "@/services/admin/adminOptionService";
import { PublicAdminOptionService } from "@/services/adminOptionService";
import {
  AdminOption,
  CreateAdminOptionInput,
  UpdateAdminOptionInput,
} from "@/types/adminOption";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ===== 관리자용 훅 =====

// 관리자 옵션 조회 (관리자용)
export const useAdminOptionsList = (category?: string) => {
  return useQuery({
    queryKey: queryKeys.admin.adminOptions(category),
    queryFn: () => AdminOptionService.getOptions(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// 관리자 옵션 생성
export const useCreateAdminOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAdminOptionInput) =>
      AdminOptionService.createOption(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.adminOptions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOptions.all });
    },
  });
};

// 관리자 옵션 수정
export const useUpdateAdminOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAdminOptionInput }) =>
      AdminOptionService.updateOption(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.adminOptions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOptions.all });
    },
  });
};

// 관리자 옵션 삭제
export const useDeleteAdminOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdminOptionService.deleteOption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.adminOptions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOptions.all });
    },
  });
};

// 관리자 옵션 토글
export const useToggleAdminOption = (category?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.admin.adminOptions(category);

  return useMutation({
    mutationFn: async ({
      id,
      isEnabled,
    }: {
      id: string;
      isEnabled: boolean;
    }) => {
      // 옵티미스틱 업데이트 - API 호출 전에 먼저 캐시 업데이트
      const previousOptions =
        queryClient.getQueryData<AdminOption[]>(queryKey);

      if (previousOptions) {
        queryClient.setQueryData<AdminOption[]>(
          queryKey,
          previousOptions.map((opt) =>
            opt.id === id ? { ...opt, is_enabled: isEnabled } : opt
          )
        );
      }

      try {
        // 실제 API 호출
        const result = await AdminOptionService.toggleOption(id, isEnabled);
        return { result, previousOptions };
      } catch (error) {
        // API 실패 시 이전 상태로 롤백
        if (previousOptions) {
          queryClient.setQueryData<AdminOption[]>(queryKey, previousOptions);
        }
        throw error;
      }
    },
    onSuccess: () => {
      // 성공 시 공개용 캐시도 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOptions.all });
    },
    onError: () => {
      // 에러 시 캐시 다시 불러오기
      queryClient.invalidateQueries({ queryKey });
    },
  });
};

// ===== 공개용 훅 =====

// 활성화된 관리자 옵션 조회 (공개용)
export const useAdminOptions = (category?: string) => {
  return useQuery({
    queryKey: queryKeys.adminOptions.options(category),
    queryFn: () => PublicAdminOptionService.getEnabledOptions(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// 특정 옵션 활성화 여부 확인
export const useIsAdminOptionEnabled = (value: string) => {
  const { data: options } = useAdminOptions();
  return options?.some((opt) => opt.value === value) ?? false;
};
