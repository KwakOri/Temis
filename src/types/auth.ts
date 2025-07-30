// 인증 관련 타입 정의

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  message: string;
  user: UserPublic;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface ApiError {
  error: string;
  details?: string[];
}