import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileService } from '@/services/fileService'
import { queryKeys } from '@/lib/queryKeys'

export const useFilesByOrderId = (orderId?: string) => {
  return useQuery({
    queryKey: orderId ? queryKeys.file.byOrderId(orderId) : [],
    queryFn: () => FileService.getFilesByOrderId(orderId!),
    enabled: !!orderId,
  })
}

export const useUploadFiles = () => {
  return useMutation({
    mutationFn: ({ files, type }: { files: File[]; type: 'character-images' | 'reference-files' }) =>
      FileService.uploadFiles(files, type),
  })
}

export const useDeleteFiles = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fileIds: string[]) => FileService.deleteFiles(fileIds),
    onSuccess: () => {
      // 파일 관련 쿼리들을 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.file.all,
      })
    },
  })
}