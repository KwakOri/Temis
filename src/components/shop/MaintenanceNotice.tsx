"use client";

import { Clock, Construction } from "lucide-react";
import Link from "next/link";

export default function MaintenanceNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="relative bg-yellow-100 dark:bg-yellow-900 rounded-full p-6">
                <Construction
                  className="w-12 h-12 text-yellow-600 dark:text-yellow-400"
                  strokeWidth={2}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              점검 중입니다
            </h1>
          </div>

          {/* Message */}
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              더 나은 서비스를 제공하기 위해 현재 상점 페이지를 점검하고
              있습니다.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              빠른 시일 내에 새로운 모습으로 찾아뵙겠습니다.
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              잠시만 기다려주세요
            </span>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors underline underline-offset-4"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
