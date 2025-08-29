"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  href?: string;
  className?: string;
}

const BackButton = ({ href, className = "" }: BackButtonProps) => {
  const router = useRouter();

  const handleBack = () => {
    if (href) {
      router.push(href);
      return;
    }
    router.back();
  };

  return (
    <button
      onClick={handleBack}
      className={`w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-sm md:text-base ${className}`}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      뒤로가기
    </button>
  );
};

export default BackButton;
