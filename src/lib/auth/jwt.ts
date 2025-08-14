import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export interface JWTPayload {
  userId: string | number;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * JWT 토큰 생성
 * @param payload - 토큰에 포함할 데이터
 * @param expiresIn - 만료 시간 (기본값: 7d)
 * @returns JWT 토큰 문자열
 */
export async function signJWT(
  payload: JWTPayload,
  expiresIn: string = "7d"
): Promise<string> {
  if (!secretKey) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(key);

    return token;
  } catch (error) {
    throw new Error("Failed to sign JWT token");
  }
}

/**
 * JWT 토큰 검증
 * @param token - 검증할 JWT 토큰
 * @returns 토큰이 유효한 경우 페이로드, 그렇지 않으면 null
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  if (!secretKey) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    const { payload } = await jwtVerify(token, key);
    
    // JWT 스펙에 따라 숫자는 문자열로 직렬화될 수 있으므로 변환
    const processedPayload = {
      ...payload,
      userId: typeof payload.userId === 'string' ? 
        (isNaN(Number(payload.userId)) ? payload.userId : Number(payload.userId)) : 
        payload.userId
    } as JWTPayload;
    
    return processedPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * JWT 토큰에서 페이로드 추출 (검증 없이)
 * 주의: 보안상 검증되지 않은 데이터이므로 민감한 작업에는 사용하지 마세요
 * @param token - JWT 토큰
 * @returns 페이로드 또는 null
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    return payload as JWTPayload;
  } catch (error) {
    console.error("JWT decode failed:", error);
    return null;
  }
}

/**
 * 요청에서 Authorization 헤더의 Bearer 토큰 추출
 * @param request - Request 객체
 * @returns JWT 토큰 문자열 또는 null
 */
export function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7); // "Bearer " 제거
}

/**
 * 쿠키에서 JWT 토큰 추출
 * @param cookieHeader - Cookie 헤더 문자열
 * @param cookieName - 토큰이 저장된 쿠키 이름 (기본값: 'auth-token')
 * @returns JWT 토큰 문자열 또는 null
 */
export function extractTokenFromCookie(
  cookieHeader: string | null,
  cookieName: string = "auth-token"
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const targetCookie = cookies.find((cookie) =>
    cookie.startsWith(`${cookieName}=`)
  );

  if (!targetCookie) {
    return null;
  }

  return targetCookie.split("=")[1];
}
