import { useQuery } from '@tanstack/react-query';

export interface OrderFile {
  id: string;
  file_key: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_category: "character_image" | "reference";
  created_at: string;
  url: string;
}

interface OrderFilesResponse {
  files: OrderFile[];
}

async function fetchOrderFiles(orderId: string): Promise<OrderFilesResponse> {
  const response = await fetch(`/api/files/by-order/${orderId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '파일을 불러올 수 없습니다.');
  }

  return response.json();
}

export function useOrderFiles(orderId: string) {
  return useQuery({
    queryKey: ['orderFiles', orderId],
    queryFn: () => fetchOrderFiles(orderId),
    enabled: !!orderId,
  });
}