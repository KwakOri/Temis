import { Tables } from "@/types/supabase";

type Template = Tables<"templates">;

export interface UserTemplate {
  id: string | number;
  access_level: "read" | "write" | "admin";
  granted_at: string | null;
  templates: Template;
}

export interface GetUserTemplatesResponse {
  templates: UserTemplate[];
}

export class UserService {
  private static baseUrl = "/api/user";

  static async getUserTemplates(): Promise<GetUserTemplatesResponse> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("템플릿 목록을 가져올 수 없습니다.");
    }

    return response.json();
  }
}
