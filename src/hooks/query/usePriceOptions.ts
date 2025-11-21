import { queryKeys } from "@/lib/queryKeys";
import { PriceOptionService } from "@/services/admin/priceOptionService";
import {
  CreatePriceOptionInput,
  PriceOption,
  UpdatePriceOptionInput,
} from "@/types/priceOption";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// 가격 옵션 목록 조회
export const usePriceOptions = (category?: string) => {
  return useQuery({
    queryKey: queryKeys.admin.priceOptions(category),
    queryFn: () => PriceOptionService.getAll(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// 가격 옵션 생성
export const useCreatePriceOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePriceOptionInput) =>
      PriceOptionService.create(input),
    onSuccess: (newOption) => {
      // 해당 카테고리의 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.priceOptions(newOption.category),
      });
      // 전체 목록 캐시도 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.priceOptions(),
      });
    },
  });
};

// 가격 옵션 수정
export const useUpdatePriceOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdatePriceOptionInput;
    }) => PriceOptionService.update(id, input),
    onSuccess: (updatedOption) => {
      // 해당 카테고리의 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.priceOptions(updatedOption.category),
      });
      // 전체 목록 캐시도 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.priceOptions(),
      });
    },
  });
};

// 가격 옵션 삭제
export const useDeletePriceOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      category,
    }: {
      id: string;
      category: string;
    }) => PriceOptionService.delete(id),
    onSuccess: (_, variables) => {
      // 해당 카테고리의 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.priceOptions(variables.category),
      });
      // 전체 목록 캐시도 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.priceOptions(),
      });
    },
  });
};

// 가격 옵션 활성화/비활성화 토글
export const useTogglePriceOption = (category?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.admin.priceOptions(category);

  return useMutation({
    mutationFn: async ({
      id,
      is_enabled,
    }: {
      id: string;
      is_enabled: boolean;
    }) => {
      // 옵티미스틱 업데이트 - API 호출 전에 먼저 캐시 업데이트
      const previousOptions =
        queryClient.getQueryData<PriceOption[]>(queryKey);

      if (previousOptions) {
        queryClient.setQueryData<PriceOption[]>(
          queryKey,
          previousOptions.map((option) =>
            option.id === id ? { ...option, is_enabled } : option
          )
        );
      }

      try {
        // 실제 API 호출
        const result = await PriceOptionService.update(id, { is_enabled });
        return { result, previousOptions };
      } catch (error) {
        // API 실패 시 이전 상태로 롤백
        if (previousOptions) {
          queryClient.setQueryData<PriceOption[]>(queryKey, previousOptions);
        }
        throw error;
      }
    },
    onSuccess: () => {
      // 성공 시 공개용 캐시도 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.all });
    },
    onError: () => {
      // 에러 시 캐시 다시 불러오기
      queryClient.invalidateQueries({ queryKey });
    },
  });
};
