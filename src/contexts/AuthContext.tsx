"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggingOut: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ success: boolean; error?: string }>;
  registerPublic: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 인증 상태 확인
  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/verify", {
        method: "GET",
        credentials: "include", // 쿠키 포함
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();

        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("🔍 AuthContext: Auth check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 로그인
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include", // 쿠키 포함
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: "로그인 중 오류가 발생했습니다." };
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      // 로그아웃 시작
      setIsLoggingOut(true);

      // 먼저 클라이언트 상태 초기화 (즉시 UI 업데이트)
      setUser(null);

      // 로컬스토리지 및 세션스토리지에서 인증 관련 데이터 제거
      if (typeof window !== "undefined") {
        const authKeys = [
          "auth-token",
          "token",
          "user",
          "access_token",
          "jwt_token",
        ];
        authKeys.forEach((key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
      }

      // 서버에 로그아웃 요청 (쿠키 제거)
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // 쿠키 포함
        headers: {
          "Content-Type": "application/json",
        },
      });

      // 인증 상태 재확인 (쿠키가 제대로 제거되었는지 확인)
      await checkAuth();
    } catch (error) {
      console.error("Logout failed:", error);

      // 로그아웃은 항상 성공으로 처리 (클라이언트에서 상태 초기화)
      setUser(null);

      // 에러가 발생해도 클라이언트 데이터는 정리
      if (typeof window !== "undefined") {
        const authKeys = [
          "auth-token",
          "token",
          "user",
          "access_token",
          "jwt_token",
        ];
        authKeys.forEach((key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
      }
    } finally {
      // 로그아웃 완료 (모달은 리다이렉트 후 자동으로 사라짐)
      setIsLoggingOut(false);
    }
  };

  // 회원가입 (기존 초대 기반)
  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include", // 쿠키 포함
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || "회원가입에 실패했습니다.",
        };
      }
    } catch (error) {
      console.error("Registration failed:", error);
      return { success: false, error: "회원가입 중 오류가 발생했습니다." };
    }
  };

  // 공개 회원가입 (이메일 인증 방식)
  const registerPublic = async (
    email: string,
    password: string,
    name: string
  ) => {
    try {
      const response = await fetch("/api/auth/register-public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || "회원가입에 실패했습니다.",
        };
      }
    } catch (error) {
      console.error("Public registration failed:", error);
      return { success: false, error: "회원가입 중 오류가 발생했습니다." };
    }
  };

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isLoggingOut,
    login,
    logout,
    register,
    registerPublic,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* 로그아웃 모달 */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4">
            <div className="flex flex-col items-center">
              {/* 로딩 애니메이션 */}
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
              </div>

              {/* 텍스트 */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                로그아웃 중...
              </h3>
              <p className="text-sm text-gray-600 text-center">
                잠시만 기다려주세요
              </p>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

// 커스텀 훅
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// HOC (Higher-Order Component) - 인증이 필요한 페이지에서 사용
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">로딩 중...</div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-red-600">로그인이 필요합니다.</div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
