'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginForm, RegisterForm, UserProfile } from '@/components/auth';

function AuthTestContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">인증 상태 확인 중...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">인증 테스트 페이지</h1>
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600">✅ 로그인 성공!</h2>
            <UserProfile />
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">사용자 정보:</h3>
            <ul className="space-y-1 text-sm">
              <li><strong>ID:</strong> {user.id}</li>
              <li><strong>이메일:</strong> {user.email}</li>
              <li><strong>이름:</strong> {user.name}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">JWT 인증 테스트</h1>
      
      <div className="max-w-md mx-auto">
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setCurrentView('login')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              currentView === 'login'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setCurrentView('register')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              currentView === 'register'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            회원가입
          </button>
        </div>

        {currentView === 'login' ? (
          <LoginForm onSuccess={() => console.log('Login successful!')} />
        ) : (
          <RegisterForm onSuccess={() => console.log('Registration successful!')} />
        )}
      </div>
    </div>
  );
}

export default function AuthTestPage() {
  return (
    <AuthProvider>
      <AuthTestContent />
    </AuthProvider>
  );
}