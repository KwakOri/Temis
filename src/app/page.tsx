import ProtectedLink from "@/components/auth/ProtectedLink";
import Link from "next/link";

export default function Home() {
  return (
    <div className="w-full h-full">
      <ProtectedLink href="/my-page">마이페이지</ProtectedLink>
      <Link href="/auth">로그인</Link>
    </div>
  );
}
