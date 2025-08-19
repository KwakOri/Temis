import { supabase } from "@/lib/supabase";
import { Token, TokenInsert, TokenType } from "@/types/supabase-types";
import { randomBytes } from "crypto";

/**
 * 토큰 유틸리티 클래스
 * 비밀번호 리셋 및 회원가입 초대 토큰 관리
 */
export class TokenService {
  /**
   * 안전한 랜덤 토큰 생성
   */
  private static generateSecureToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * 토큰 생성
   */
  static async createToken(
    email: string,
    type: TokenType,
    expiresInHours: number = 24,
    userId?: number
  ): Promise<string> {
    try {
      const token = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      // 기존 미사용 토큰이 있다면 사용처리
      await this.invalidateExistingTokens(email, type);

      const tokenData: TokenInsert = {
        email,
        token,
        type,
        user_id: userId || null,
        expires_at: expiresAt.toISOString(),
      };

      const { error } = await supabase.from("tokens").insert([tokenData]);

      if (error) {
        throw error;
      }

      return token;
    } catch (error) {
      console.error("Error creating token:", error);
      throw new Error("토큰 생성 중 오류가 발생했습니다.");
    }
  }

  /**
   * 토큰 유효성 검증
   */
  static async validateToken(
    token: string,
    type?: TokenType
  ): Promise<{
    isValid: boolean;
    tokenData?: Token;
    error?: string;
  }> {
    try {
      let query = supabase
        .from("tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString());

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === "PGRST116") {
          return {
            isValid: false,
            error: "유효하지 않거나 만료된 토큰입니다.",
          };
        }
        throw error;
      }

      return {
        isValid: true,
        tokenData: data as Token,
      };
    } catch (error) {
      console.error("Error validating token:", error);
      return {
        isValid: false,
        error: "토큰 검증 중 오류가 발생했습니다.",
      };
    }
  }

  /**
   * 토큰 사용 처리
   */
  static async markTokenAsUsed(token: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("tokens")
        .update({
          used: true,
          updated_at: new Date().toISOString(),
        })
        .eq("token", token);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error using token:", error);
      return false;
    }
  }

  /**
   * 기존 미사용 토큰 무효화
   */
  static async invalidateExistingTokens(
    email: string,
    type: TokenType
  ): Promise<void> {
    try {
      await supabase
        .from("tokens")
        .update({
          used: true,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email)
        .eq("type", type)
        .eq("used", false);
    } catch (error) {
      console.error("Error invalidating existing tokens:", error);
      // 에러가 발생해도 새 토큰 생성을 막지 않음
    }
  }

  /**
   * 만료된 토큰 정리
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      await supabase
        .from("tokens")
        .delete()
        .or(
          `expires_at.lt.${new Date().toISOString()},and(used.eq.true,created_at.lt.${new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString()})`
        );
    } catch (error) {
      console.error("Error cleaning up expired tokens:", error);
    }
  }

  /**
   * 사용자의 토큰 조회 (관리자용)
   */
  static async getUserTokens(
    email: string,
    type?: TokenType
  ): Promise<Token[]> {
    try {
      let query = supabase
        .from("tokens")
        .select("*")
        .eq("email", email)
        .order("created_at", { ascending: false });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Token[];
    } catch (error) {
      console.error("Error getting user tokens:", error);
      throw new Error("사용자 토큰 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 모든 토큰 조회 (관리자용)
   */
  static async getAllTokens(type?: TokenType): Promise<Token[]> {
    try {
      let query = supabase
        .from("tokens")
        .select("*")
        .order("created_at", { ascending: false });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Token[];
    } catch (error) {
      console.error("Error getting all tokens:", error);
      throw new Error("토큰 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 토큰 삭제 (관리자용)
   */
  static async deleteToken(tokenId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("tokens")
        .delete()
        .eq("id", tokenId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error deleting token:", error);
      return false;
    }
  }

}