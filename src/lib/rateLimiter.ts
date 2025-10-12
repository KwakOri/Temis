/**
 * 프론트엔드 Rate Limiter
 * API 요청 빈도를 제한하여 과도한 요청 방지
 */

interface RateLimitConfig {
  maxRequests: number; // 최대 요청 수
  windowMs: number; // 시간 윈도우 (밀리초)
  blockDurationMs?: number; // 제한 시 차단 시간
}

interface RequestRecord {
  timestamps: number[];
  blockedUntil?: number;
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      blockDurationMs: 60000, // 기본 1분 차단
      ...config,
    };
  }

  /**
   * 요청 가능 여부 확인
   */
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const record = this.requests.get(key) || { timestamps: [] };

    // 차단 중인지 확인
    if (record.blockedUntil && now < record.blockedUntil) {
      return false;
    }

    // 차단 해제
    if (record.blockedUntil && now >= record.blockedUntil) {
      record.blockedUntil = undefined;
    }

    // 윈도우 밖의 오래된 타임스탬프 제거
    const windowStart = now - this.config.windowMs;
    record.timestamps = record.timestamps.filter(
      (timestamp) => timestamp > windowStart
    );

    // 요청 수 확인
    return record.timestamps.length < this.config.maxRequests;
  }

  /**
   * 요청 기록
   */
  recordRequest(key: string): void {
    const now = Date.now();
    const record = this.requests.get(key) || { timestamps: [] };

    record.timestamps.push(now);

    // 제한 초과 시 차단
    if (record.timestamps.length >= this.config.maxRequests) {
      record.blockedUntil = now + (this.config.blockDurationMs || 60000);
    }

    this.requests.set(key, record);
  }

  /**
   * 요청 시도 (가능 여부 확인 + 기록)
   */
  attempt(key: string): {
    allowed: boolean;
    remainingRequests: number;
    retryAfter?: number;
  } {
    const allowed = this.canMakeRequest(key);

    if (!allowed) {
      const record = this.requests.get(key);
      const retryAfter = record?.blockedUntil
        ? Math.ceil((record.blockedUntil - Date.now()) / 1000)
        : 0;

      return {
        allowed: false,
        remainingRequests: 0,
        retryAfter,
      };
    }

    this.recordRequest(key);

    const record = this.requests.get(key)!;
    const remainingRequests = Math.max(
      0,
      this.config.maxRequests - record.timestamps.length
    );

    return {
      allowed: true,
      remainingRequests,
    };
  }

  /**
   * 특정 키의 제한 초기화
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * 모든 제한 초기화
   */
  resetAll(): void {
    this.requests.clear();
  }

  /**
   * 주기적 정리 (메모리 관리)
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, record] of this.requests.entries()) {
      // 오래된 기록 제거
      record.timestamps = record.timestamps.filter(
        (timestamp) => timestamp > windowStart
      );

      // 빈 기록 삭제
      if (
        record.timestamps.length === 0 &&
        (!record.blockedUntil || now > record.blockedUntil)
      ) {
        this.requests.delete(key);
      }
    }
  }
}

// 사전 정의된 Rate Limiter 인스턴스
export const authRateLimiter = new RateLimiter({
  maxRequests: 5, // 5번까지
  windowMs: 60000, // 1분 내
  blockDurationMs: 120000, // 2분 차단
});

export const apiRateLimiter = new RateLimiter({
  maxRequests: 30, // 30번까지
  windowMs: 60000, // 1분 내
  blockDurationMs: 60000, // 1분 차단
});

// 주기적 정리 (5분마다)
if (typeof window !== "undefined") {
  setInterval(() => {
    authRateLimiter.cleanup();
    apiRateLimiter.cleanup();
  }, 300000);
}

export default RateLimiter;
