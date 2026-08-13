import { queryKeys } from "@/lib/queryKeys";
import { AdminOrderService } from "@/services/admin/orderService";
import { GetCustomOrdersParams, UpdateCustomOrderData } from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminCustomOrders = (params: GetCustomOrdersParams = {}) => {
  return useQuery({
    queryKey: queryKeys.admin.customOrders(params),
    queryFn: () => AdminOrderService.getCustomOrders(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateCustomOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdateCustomOrderData;
    }) => AdminOrderService.updateCustomOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.customOrdersRoot(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.calendarRoot("custom"),
      });
    },
  });
};

export const useAdminThumbnailOrders = (params: GetCustomOrdersParams = {}) => {
  return useQuery({
    queryKey: queryKeys.admin.thumbnailOrders(params),
    queryFn: () => AdminOrderService.getThumbnailCustomOrders(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useUpdateAdminThumbnailOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: import("@/types/customThumbnailOrder").AdminUpdateThumbnailCustomOrderData;
    }) => AdminOrderService.updateThumbnailCustomOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.thumbnailOrdersRoot(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.customOrdersRoot(),
      });
    },
  });
};

export const useCompleteThumbnailCustomOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      resultTemplateId,
    }: {
      orderId: string;
      resultTemplateId: string;
    }) =>
      AdminOrderService.completeThumbnailCustomOrder(orderId, resultTemplateId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.thumbnailOrdersRoot(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.customOrdersRoot(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.templates(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.shop.userAccess(String(result.access.user_id)),
      });
    },
  });
};

// Alias for component compatibility
export const useUpdateCustomOrderStatus = useUpdateCustomOrder;

export const useUpdateLegacyOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdateCustomOrderData;
    }) => AdminOrderService.updateLegacyOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.calendarRoot("legacy"),
      });
    },
  });
};

// Calendar hooks with date formatting
export const useAdminCustomOrdersCalendar = (year: number, month: number) => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  return useQuery({
    queryKey: queryKeys.admin.calendar("custom", startDateStr, endDateStr),
    queryFn: () =>
      AdminOrderService.getCustomOrdersCalendar(startDateStr, endDateStr),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useAdminLegacyOrdersCalendar = (year: number, month: number) => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  return useQuery({
    queryKey: queryKeys.admin.calendar("legacy", startDateStr, endDateStr),
    queryFn: () =>
      AdminOrderService.getLegacyOrdersCalendar(startDateStr, endDateStr),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useAdminMigrationStatus = () => {
  return useQuery({
    queryKey: queryKeys.admin.migrationStatus(),
    queryFn: () => AdminOrderService.getMigrationStatus(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useMigrateCustomOrders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AdminOrderService.runMigration,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.migrationStatus(),
      });
    },
  });
};

export const useUpdateCustomOrderDeadline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      deadline,
    }: {
      orderId: string;
      deadline: string;
    }) => AdminOrderService.updateCustomOrder(orderId, { deadline }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.customOrdersRoot(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.calendarRoot("custom"),
      });
    },
  });
};
