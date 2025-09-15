import {
  CustomOrder,
  GetCalendarResponse,
  GetCustomOrdersParams,
  GetCustomOrdersResponse,
  LegacyOrder,
  MigrationResult,
  MigrationStatus,
  UpdateCustomOrderData,
} from "@/types/admin";

export class AdminOrderService {
  private static baseUrl = "/api/admin";

  // Custom Orders
  static async getCustomOrders(
    params: GetCustomOrdersParams = {}
  ): Promise<GetCustomOrdersResponse> {
    const searchParams = new URLSearchParams();

    if (params.status) searchParams.append("status", params.status);
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    const response = await fetch(
      `${this.baseUrl}/custom-orders?${searchParams.toString()}`
    );

    if (!response.ok) {
      throw new Error("주문 목록을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async updateCustomOrder(
    orderId: string,
    data: UpdateCustomOrderData
  ): Promise<CustomOrder> {
    const response = await fetch(`${this.baseUrl}/custom-orders/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "주문 업데이트에 실패했습니다.");
    }

    return response.json();
  }

  // Calendar
  static async getCustomOrdersCalendar(
    startDate: string,
    endDate: string
  ): Promise<GetCalendarResponse> {
    const response = await fetch(
      `${this.baseUrl}/custom-orders/calendar?startDate=${startDate}&endDate=${endDate}`
    );

    if (!response.ok) {
      throw new Error("캘린더 데이터를 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async getLegacyOrdersCalendar(
    startDate: string,
    endDate: string
  ): Promise<GetCalendarResponse> {
    const response = await fetch(
      `${this.baseUrl}/legacy-orders/calendar?startDate=${startDate}&endDate=${endDate}`
    );

    if (!response.ok) {
      throw new Error("레거시 캘린더 데이터를 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  // Legacy Orders
  static async updateLegacyOrder(
    orderId: string,
    data: UpdateCustomOrderData
  ): Promise<LegacyOrder> {
    const response = await fetch(`${this.baseUrl}/legacy-orders/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "레거시 주문 업데이트에 실패했습니다.");
    }

    return response.json();
  }

  // Migration
  static async getMigrationStatus(): Promise<MigrationStatus> {
    const response = await fetch(`${this.baseUrl}/migrate-file-references`);

    if (!response.ok) {
      throw new Error("마이그레이션 상태를 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async runMigration(): Promise<MigrationResult> {
    const response = await fetch(`${this.baseUrl}/migrate-file-references`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "마이그레이션 실행에 실패했습니다.");
    }

    return response.json();
  }
}
