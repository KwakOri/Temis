import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Supabase 클라이언트 생성 (타입 안전성과 함께)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export type User = Database["public"]["Tables"]["users"]["Row"];

// Note: User type is now imported from @/types/database

// 사용자 데이터베이스 작업을 위한 서비스 클래스
export class UserService {
  /**
   * 이메일로 사용자 조회
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data as User;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw new Error("사용자 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * ID로 사용자 조회
   */
  static async findById(id: string | number): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return data as User;
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw new Error("사용자 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 새 사용자 생성
   */
  static async create(
    userData: Omit<User, "id" | "created_at" | "updated_at">
  ): Promise<User> {
    try {
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            ...userData,
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as User;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("사용자 생성 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자 정보 업데이트
   */
  static async update(
    id: number,
    updates: Partial<Omit<User, "id" | "created_at">>
  ): Promise<User> {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as User;
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error("사용자 정보 업데이트 중 오류가 발생했습니다.");
    }
  }

  /**
   * 사용자 삭제
   */
  static async delete(id: number): Promise<boolean> {
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw new Error("사용자 삭제 중 오류가 발생했습니다.");
    }
  }

  /**
   * 모든 사용자 조회 (관리자용)
   */
  static async findAll(limit = 100, offset = 0): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, created_at, updated_at") // 비밀번호는 제외
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data as User[];
    } catch (error) {
      console.error("Error finding all users:", error);
      throw new Error("사용자 목록 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 전체 사용자 수 조회 (관리자용)
   */
  static async countAll(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true });

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error("Error counting all users:", error);
      throw new Error("사용자 수 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 이메일 중복 체크
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .limit(1);

      if (error) {
        throw error;
      }

      return data.length > 0;
    } catch (error) {
      console.error("Error checking email existence:", error);
      throw new Error("이메일 중복 확인 중 오류가 발생했습니다.");
    }
  }

  /**
   * JWT 토큰에서 userId를 가져와 최신 사용자 정보 조회
   * (미들웨어와 함께 사용하여 최신 사용자 정보 확인)
   */
  static async getCurrentUser(
    userId: number
  ): Promise<Omit<User, "password"> | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, created_at, updated_at")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return data as Omit<User, "password">;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * ID로 사용자 조회 (getById alias for findById)
   */
  static async getById(id: string | number): Promise<User | null> {
    return this.findById(id);
  }

  /**
   * ID로 사용자 삭제 (deleteById alias for delete)
   */
  static async deleteById(id: number): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * 사용자 역할 업데이트
   */
  static async updateRole(id: number, role: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ 
          role,
          updated_at: new Date().toISOString() 
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as User;
    } catch (error) {
      console.error("Error updating user role:", error);
      throw new Error("사용자 역할 업데이트 중 오류가 발생했습니다.");
    }
  }
}
