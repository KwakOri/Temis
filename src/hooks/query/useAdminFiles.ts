import { queryKeys } from "@/lib/queryKeys";
import { AdminFileService } from "@/services/admin/fileService";
import { DownloadZipData } from "@/types/admin";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useAdminFiles = (fileIds: string[]) => {
  return useQuery({
    queryKey: queryKeys.admin.files(fileIds),
    queryFn: () => AdminFileService.getFiles({ fileIds }),
    enabled: fileIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useDownloadFile = () => {
  return useMutation({
    mutationFn: (fileId: string) => AdminFileService.downloadFile(fileId),
    onSuccess: (blob, fileId) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `file_${fileId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};

export const useDownloadZip = () => {
  return useMutation({
    mutationFn: (data: DownloadZipData) => AdminFileService.downloadZip(data),
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "files.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};
