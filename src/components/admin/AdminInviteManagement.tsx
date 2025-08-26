"use client";

import { useState, useEffect } from "react";
import { Tables } from "@/types/supabase";

type Token = Tables<'tokens'>;
import EmailTestPanel from "./EmailTestPanel";

interface AdminInviteManagementProps {
  onSuccess?: () => void;
}

export default function AdminInviteManagement({ onSuccess }: AdminInviteManagementProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [invites, setInvites] = useState<Token[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // 초대 목록 조회
  const fetchInvites = async () => {
    setLoadingInvites(true);
    try {
      const response = await fetch("/api/admin/invites", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error("Failed to fetch invites:", error);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "초대 발송에 실패했습니다.");
      }

      setSuccess(`${email}로 초대 이메일을 발송했습니다.`);
      setEmail("");
      
      // 초대 목록 새로고침
      fetchInvites();

      // 성공 메시지 5초 후 자동 제거
      setTimeout(() => setSuccess(""), 5000);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "초대 발송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (tokenId: string) => {
    if (!confirm("이 초대를 취소하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/invites/${tokenId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setSuccess("초대가 취소되었습니다.");
        fetchInvites();
        // 성공 메시지 3초 후 자동 제거
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "초대 취소에 실패했습니다.");
      }
    } catch (error) {
      setError("초대 취소 중 오류가 발생했습니다.");
    }
  };

  const handleResendInvite = async (email: string, tokenId: string) => {
    if (!confirm(`${email}에게 초대를 재발송하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch("/api/admin/resend-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, tokenId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${email}로 초대 이메일을 재발송했습니다.`);
        fetchInvites();
        // 성공 메시지 5초 후 자동 제거
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(data.error || "초대 재발송에 실패했습니다.");
      }
    } catch (error) {
      setError("초대 재발송 중 오류가 발생했습니다.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR");
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // 초대 통계 계산
  const inviteStats = {
    total: invites.length,
    pending: invites.filter(invite => !invite.used && !isExpired(invite.expires_at)).length,
    used: invites.filter(invite => invite.used).length,
    expired: invites.filter(invite => !invite.used && isExpired(invite.expires_at)).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">회원 초대 관리</h2>
        <p className="text-gray-600">새로운 사용자를 초대하고 초대 상태를 관리하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">전체 초대</dt>
                  <dd className="text-lg font-medium text-gray-900">{inviteStats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">⏳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">대기 중</dt>
                  <dd className="text-lg font-medium text-gray-900">{inviteStats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">가입 완료</dt>
                  <dd className="text-lg font-medium text-gray-900">{inviteStats.used}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">❌</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">만료됨</dt>
                  <dd className="text-lg font-medium text-gray-900">{inviteStats.expired}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Invite Form */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">새 사용자 초대</h3>
        </div>
        <div className="px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일 주소
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="user@example.com"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "발송 중..." : "초대 발송"}
            </button>
          </form>
        </div>
      </div>

      {/* Invites List */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">초대 현황</h3>
          <button
            onClick={fetchInvites}
            className="text-sm text-indigo-600 hover:text-indigo-800"
            disabled={loadingInvites}
          >
            {loadingInvites ? "새로고침 중..." : "새로고침"}
          </button>
        </div>
        <div className="overflow-x-auto">
          {invites.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              발송된 초대가 없습니다.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    발송일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    만료일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invite.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invite.used ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          사용됨
                        </span>
                      ) : isExpired(invite.expires_at) ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          만료됨
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          대기 중
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invite.created_at || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invite.expires_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!invite.used && !isExpired(invite.expires_at) && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleResendInvite(invite.email, invite.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            재발송
                          </button>
                          <button
                            onClick={() => handleCancelInvite(invite.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            취소
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 이메일 테스트 도구 (개발 환경 전용) */}
      <EmailTestPanel />

      {/* 도움말 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">사용법 안내</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 이메일을 입력하고 &apos;초대 발송&apos; 버튼을 클릭하면 회원가입 링크가 발송됩니다.</li>
          <li>• 초대 링크는 72시간 후 자동으로 만료됩니다.</li>
          <li>• &apos;대기 중&apos; 상태의 초대는 재발송하거나 취소할 수 있습니다.</li>
          <li>• 사용자가 회원가입을 완료하면 상태가 &apos;사용됨&apos;으로 변경됩니다.</li>
          <li>• 이미 가입된 이메일로는 초대를 발송할 수 없습니다.</li>
        </ul>
      </div>
    </div>
  );
}