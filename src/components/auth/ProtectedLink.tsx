'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ProtectedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function ProtectedLink({ href, children, className, onClick }: ProtectedLinkProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }

    if (!loading && !user) {
      e.preventDefault();
      // 목표 경로를 returnUrl로 설정하여 로그인 페이지로 리다이렉트
      const returnUrl = encodeURIComponent(href);
      router.push(`/auth?returnUrl=${returnUrl}`);
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}