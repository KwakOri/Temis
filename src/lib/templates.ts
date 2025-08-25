import { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";
import { supabase } from "./supabase";

type Template = Tables<"templates">;
type TemplateAccess = Tables<"template_access">;
type User = Tables<"users">;
type TemplateInsert = TablesInsert<"templates">;
type TemplateUpdate = TablesUpdate<"templates">;
type TemplateAccessInsert = TablesInsert<"template_access">;
type AccessLevel = TemplateAccess["access_level"];

interface TemplateAccessWithUser extends TemplateAccess {
  users?: User;
}

interface UserTemplateAccess extends TemplateAccess {
  templates?: Template;
}

/**
 * 템플릿 관리 서비스
 */
export class TemplateService {
  /**
   * 템플릿 생성
   */
  static async create(templateData: TemplateInsert): Promise<Template> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .insert([templateData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating template:", error);
      throw new Error("템플릿 생성 중 오류가 발생했습니다.");
    }
  }

  /**
   * 템플릿 조회 (ID)
   */
  static async findById(id: string): Promise<Template | null> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error finding template:", error);
      throw new Error("템플릿 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자의 템플릿 목록 조회 (소유 + 접근 권한)
   */
  static async findUserTemplates(
    userId: number
  ): Promise<UserTemplateAccess[]> {
    try {
      // Note: created_by 컬럼이 제거되어 소유한 템플릿 조회 불가
      // const ownedTemplates: Template[] = [];

      // 2. 접근 권한이 있는 템플릿
      const { data: accessibleTemplates, error: accessError } = await supabase
        .from("template_access")
        .select(
          `
          id,
          template_id,
          user_id,
          access_level,
          granted_at,
          granted_by,
          templates:templates(*)
        `
        )
        .eq("user_id", userId);

      if (accessError) throw accessError;

      // 결과 조합
      const result: UserTemplateAccess[] = [];

      // Note: 소유한 템플릿 개념이 제거됨

      // 접근 권한이 있는 템플릿
      accessibleTemplates.forEach((access) => {
        if (
          access.templates &&
          typeof access.templates === "object" &&
          !Array.isArray(access.templates)
        ) {
          result.push({
            id: access.id,
            template_id: access.template_id,
            user_id: access.user_id,
            templates: access.templates as Template,
            access_level: access.access_level as AccessLevel,
            granted_at: access.granted_at || "",
            granted_by: access.granted_by || 0,
          });
        }
      });

      return result;
    } catch (error) {
      console.error("Error finding user templates:", error);
      throw new Error("사용자 템플릿 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 공개 템플릿 목록 조회
   */
  static async findPublicTemplates(
    limit = 20,
    offset = 0
  ): Promise<Template[]> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("is_public", true)
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error finding public templates:", error);
      throw new Error("공개 템플릿 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 템플릿 업데이트
   */
  static async update(id: string, updates: TemplateUpdate): Promise<Template> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating template:", error);
      throw new Error("템플릿 업데이트 중 오류가 발생했습니다.");
    }
  }

  /**
   * 템플릿 삭제
   */
  static async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("templates").delete().eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting template:", error);
      throw new Error("템플릿 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 템플릿 접근 권한 확인
   */
  static async hasAccess(templateId: string, userId: string): Promise<boolean> {
    try {
      // Parameter validation
      if (!templateId || !userId) {
        return false;
      }

      // Validate templateId is a UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(templateId)) {
        return false;
      }

      // 1. 먼저 템플릿이 공개되어 있는지 확인
      const { data: templateData, error: templateError } = await supabase
        .from("templates")
        .select("is_public")
        .eq("id", templateId)
        .single();

      if (templateError) {
        return false;
      }

      // 공개 템플릿이면 접근 허용
      if (templateData?.is_public) {
        return true;
      }

      // 2. template_access 테이블에서 권한 확인
      const { data: accessData, error: accessError } = await supabase
        .from("template_access")
        .select("id")
        .eq("template_id", templateId)
        .eq("user_id", parseInt(userId))
        .limit(1);

      if (accessError) {
        return false;
      }

      // 레코드가 존재하면 접근 권한이 있음
      return accessData && accessData.length > 0;
    } catch (error) {
      console.error("Error checking template access:", error);
      return false;
    }
  }
}

/**
 * 템플릿 접근 권한 관리 서비스
 */
export class TemplateAccessService {
  /**
   * 접근 권한 부여
   */
  static async grantAccess(
    accessData: TemplateAccessInsert
  ): Promise<TemplateAccess> {
    try {
      const { data, error } = await supabase
        .from("template_access")
        .insert([accessData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error granting template access:", error);
      throw new Error("템플릿 접근 권한 부여 중 오류가 발생했습니다.");
    }
  }

  /**
   * 접근 권한 조회
   */
  static async getAccess(
    templateId: string,
    userId: number
  ): Promise<TemplateAccess | null> {
    try {
      const { data, error } = await supabase
        .from("template_access")
        .select("*")
        .eq("template_id", templateId)
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error getting template access:", error);
      throw new Error("템플릿 접근 권한 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 템플릿의 모든 접근 권한 조회
   */
  static async getTemplateAccessList(
    templateId: string
  ): Promise<TemplateAccessWithUser[]> {
    try {
      const { data, error } = await supabase
        .from("template_access")
        .select(
          `
          *,
          user:users!user_id(*)
        `
        )
        .eq("template_id", templateId)
        .order("granted_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting template access list:", error);
      throw new Error("템플릿 접근 권한 목록 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 접근 권한 수정
   */
  static async updateAccess(
    templateId: string,
    userId: number,
    accessLevel: AccessLevel
  ): Promise<TemplateAccess> {
    try {
      const { data, error } = await supabase
        .from("template_access")
        .update({ access_level: accessLevel })
        .eq("template_id", templateId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating template access:", error);
      throw new Error("템플릿 접근 권한 수정 중 오류가 발생했습니다.");
    }
  }

  /**
   * 접근 권한 제거
   */
  static async revokeAccess(
    templateId: string,
    userId: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("template_access")
        .delete()
        .eq("template_id", templateId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error revoking template access:", error);
      throw new Error("템플릿 접근 권한 제거 중 오류가 발생했습니다.");
    }
  }

  /**
   * 대량 접근 권한 부여
   */
  static async grantBulkAccess(
    templateId: string,
    userIds: number[],
    accessLevel: AccessLevel = "read",
    grantedBy: number
  ): Promise<TemplateAccess[]> {
    try {
      const accessData: TemplateAccessInsert[] = userIds.map((userId) => ({
        template_id: templateId,
        user_id: userId,
        access_level: accessLevel,
        granted_by: grantedBy,
      }));

      const { data, error } = await supabase
        .from("template_access")
        .insert(accessData)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error granting bulk template access:", error);
      throw new Error("대량 템플릿 접근 권한 부여 중 오류가 발생했습니다.");
    }
  }
}
