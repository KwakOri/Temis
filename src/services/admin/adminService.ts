export class AdminService {
  private static baseUrl = "/api/admin";

  // Check admin permissions
  static async checkAdminPermission(): Promise<{ isAdmin: boolean }> {
    const response = await fetch(`${this.baseUrl}/users`, {
      credentials: "include",
    });

    console.log("response => ", response);

    if (response.status === 403) {
      return { isAdmin: false };
    } else if (response.ok) {
      return { isAdmin: true };
    } else {
      throw new Error("Failed to check admin permission");
    }
  }
}
