import { supabase } from "@/lib/supabase";
import {
  GrantTemplateAccessData,
  SendAccessGrantedEmailData,
  TemplatePurchaseRequestWithRelations,
} from "@/types/admin";

export class AdminPurchaseService {
  // Template Purchase Requests (Supabase)
  static async getPurchaseRequests(): Promise<TemplatePurchaseRequestWithRelations[]> {
    const { data, error } = await supabase
      .from("template_purchase_requests")
      .select(`
        *,
        template:templates(*),
        template_plan:template_plans(*),
        user:users(id, name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`구매 요청을 가져오는데 실패했습니다: ${error.message}`);
    }

    return data || [];
  }

  static async findUserByEmail(email: string): Promise<{ id: number; name: string; email: string } | null> {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw new Error(`사용자를 찾는데 실패했습니다: ${error.message}`);
    }

    return data;
  }

  static async getTemplateById(templateId: string): Promise<{ id: string; name: string } | null> {
    const { data, error } = await supabase
      .from("templates")
      .select("id, name")
      .eq("id", templateId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`템플릿을 찾는데 실패했습니다: ${error.message}`);
    }

    return data;
  }

  static async grantTemplateAccess(
    data: GrantTemplateAccessData
  ): Promise<void> {
    const { error } = await supabase.from("template_access").insert({
      template_id: data.template_id,
      user_id: data.user_id,
      access_level: data.access_level,
      granted_by: data.user_id, // This should be the admin user ID
    });

    if (error) {
      throw new Error(`템플릿 접근 권한 부여에 실패했습니다: ${error.message}`);
    }
  }

  static async updatePurchaseRequestStatus(
    requestId: string,
    status: string
  ): Promise<void> {
    const { error } = await supabase
      .from("template_purchase_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      throw new Error(
        `구매 요청 상태 업데이트에 실패했습니다: ${error.message}`
      );
    }
  }

  // Email notification (API)
  static async sendAccessGrantedEmail(
    data: SendAccessGrantedEmailData
  ): Promise<void> {
    const response = await fetch("/api/email/template-access-granted", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "이메일 전송에 실패했습니다.");
    }
  }

  // 통합 승인 프로세스
  static async approvePurchaseRequest(
    requestId: string,
    templateId: string,
    userId: number,
    planId?: string
  ): Promise<void> {
    // 1. 사용자 정보 가져오기
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    // 2. 관리자 ID 찾기
    const admin = await this.findUserByEmail("timetable@admin.com");
    if (!admin) {
      throw new Error("관리자 계정을 찾을 수 없습니다.");
    }

    // 3. 템플릿 정보 가져오기
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error("템플릿을 찾을 수 없습니다.");
    }

    // 4. 템플릿 접근 권한 부여
    const { error: accessError } = await supabase
      .from("template_access")
      .insert({
        template_id: templateId,
        user_id: user.id,
        access_level: "write",
        granted_by: admin.id,
        template_plan_id: planId, // 플랜 ID 저장
      });

    if (accessError) {
      throw new Error(`권한 부여에 실패했습니다: ${accessError.message}`);
    }

    // 5. 구매 신청 상태 업데이트
    await this.updatePurchaseRequestStatus(requestId, "completed");

    // 6. 이메일 발송 (선택적)
    try {
      const emailData: SendAccessGrantedEmailData = {
        email: user.email,
        userName: user.name || "고객",
        templateName: template.name,
      };
      await this.sendAccessGrantedEmail(emailData);
    } catch (emailError) {
      console.error("메일 발송 실패:", emailError);
      // 메일 발송 실패는 전체 프로세스를 중단하지 않음
    }
  }
}
