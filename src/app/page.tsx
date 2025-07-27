"use client";

import ProtectedLink from "@/components/auth/ProtectedLink";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include',
      });
      
      if (response.ok) {
        setIsLoggedIn(true);
        // 관리자 권한 확인
        await checkAdminStatus();
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    } catch (error) {
      setIsLoggedIn(false);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      // 관리자 페이지에 접근해보면서 관리자 권한 확인
      const response = await fetch('/api/admin/users?limit=1', {
        credentials: 'include',
      });
      setIsAdmin(response.ok);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        // 페이지 새로고침하여 상태 초기화
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div
      className="absolute inset-0 w-full h-full bg-blue-50 flex flex-col gap-4 justify-center items-center"
    >
      <ProtectedLink href="/my-page" className="flex">
        <p className="px-4 py-2 rounded-full bg-primary-dark text-white font-bold hover:brightness-125 cursor-pointer">
          마이페이지
        </p>
      </ProtectedLink>

      {/* 관리자 버튼 - 로그인된 관리자에게만 표시 */}
      {isLoggedIn && isAdmin && (
        <Link href="/admin" className="flex">
          <p className="px-4 py-2 rounded-full bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors cursor-pointer">
            관리자 페이지
          </p>
        </Link>
      )}
      
      {loading ? (
        <div className="px-4 py-2 rounded-full bg-gray-300 text-gray-600 font-bold">
          로딩 중...
        </div>
      ) : isLoggedIn ? (
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition-colors cursor-pointer"
        >
          로그아웃
        </button>
      ) : (
        <Link href="/auth" className="flex">
          <p className="px-4 py-2 rounded-full bg-primary-dark text-white font-bold hover:brightness-125 cursor-pointer">
            로그인
          </p>
        </Link>
      )}
      
      <p
        style={{
          fontSize: "160px",
          fontWeight: "bold",
        }}
      >
        세영이 사랑해~!
      </p>
    </div>
  );
}
