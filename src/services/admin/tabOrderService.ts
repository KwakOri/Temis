import { AdminTabOrder, UpdateTabOrderRequest } from "@/types/tabOrder";

export class TabOrderService {
  private static baseUrl = "/api/admin/tab-order";

  static async getTabOrders(): Promise<AdminTabOrder[]> {
    const response = await fetch(this.baseUrl, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tab orders");
    }

    const data = await response.json();
    return data.tabOrders;
  }

  static async updateTabOrders(
    orders: UpdateTabOrderRequest["orders"]
  ): Promise<AdminTabOrder[]> {
    const response = await fetch(this.baseUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ orders }),
    });

    if (!response.ok) {
      throw new Error("Failed to update tab orders");
    }

    const data = await response.json();
    return data.tabOrders;
  }
}
