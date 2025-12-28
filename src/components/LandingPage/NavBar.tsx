import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CategoryChipProps {
  href: string;
  label: string;
  onClick?: () => void;
}

const Title = () => {
  return (
    <p
      style={{
        fontFamily: "Paperlogy",
      }}
      className="w-32 md:w-60 text-left text-2xl md:text-[40px] font-semibold text-[#1B1612]"
    >
      TEMIS
    </p>
  );
};

const categories = [
  { href: "/shop", label: "SHOP" },
  { href: "/portfolio", label: "PROTFOLIO" },
  { href: "/work-schedule", label: "PROGRESS" },
];

const CategoryChip = ({ href, label, onClick }: CategoryChipProps) => {
  return (
    <Link href={href} onClick={onClick}>
      <p className="text-base md:text-2xl font-bold h-10 md:h-12 px-4 md:px-8 rounded-full flex justify-center items-center bg-transparent hover:bg-black/10 whitespace-nowrap">
        {label}
      </p>
    </Link>
  );
};

const CategoryBar = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  return (
    <div className="hidden md:flex items-center px-1 gap-[10px] h-15 rounded-full bg-[#F5EDEC] border-2 border-[#E2D4C4] shadow-[0_2px_3.4px_rgba(0,0,0,0.25)]">
      {categories.map((category, i) => {
        return (
          <CategoryChip
            key={i}
            href={category.href}
            label={category.label}
            onClick={onLinkClick}
          />
        );
      })}
    </div>
  );
};

const OptionBar = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/auth");
    onLinkClick?.();
  };

  if (loading) {
    return (
      <div className="hidden md:flex items-center px-1.5 gap-[10px] h-15 rounded-full bg-[#F5EDEC] border-2 border-[#E2D4C4] shadow-[0_2px_3.4px_rgba(0,0,0,0.25)]">
        <div className="text-2xl font-semibold h-11 px-5 rounded-full flex justify-center items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
        </div>
      </div>
    );
  }

  if (user) {
    // 로그인 상태: 마이페이지 + 로그아웃
    return (
      <div className="hidden md:flex items-center px-1.5 gap-[10px] h-15 rounded-full bg-[#F5EDEC] border-2 border-[#E2D4C4] shadow-[0_2px_3.4px_rgba(0,0,0,0.25)]">
        <Link href={"/my-page"} onClick={onLinkClick}>
          <p className="text-2xl font-semibold h-11 px-5 rounded-full flex justify-center items-center bg-transparent hover:bg-black/10 ">
            My Page
          </p>
        </Link>
        <button onClick={handleLogout}>
          <p className="text-xl text-white font-semibold h-11 px-5 rounded-full flex justify-center items-center bg-[#FC712B] brightness-100 hover:brightness-75 ">
            Log Out
          </p>
        </button>
      </div>
    );
  }

  // 로그아웃 상태: 로그인 + 회원가입
  return (
    <div className="hidden md:flex items-center px-1.5 gap-[10px] h-15 rounded-full bg-[#F5EDEC] border-2 border-[#E2D4C4] shadow-[0_2px_3.4px_rgba(0,0,0,0.25)]">
      <Link href={"/auth"} onClick={onLinkClick}>
        <p className="text-2xl font-semibold h-11 px-5 rounded-full flex justify-center items-center bg-transparent hover:bg-black/10 ">
          Log In
        </p>
      </Link>
      <Link href={"/auth?mode=signup"} onClick={onLinkClick}>
        <p className="text-xl text-white font-semibold h-11 px-5 rounded-full flex justify-center items-center bg-[#FC712B] brightness-100 hover:brightness-75 ">
          Sign Up
        </p>
      </Link>
    </div>
  );
};

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/auth");
    setIsMenuOpen(false);
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="sticky top-0 w-full bg-[#F3E9E7] z-50 shadow-sm md:bg-transparent md:shadow-none">
      <div className="max-w-[1440px] w-full mx-auto flex flex-col items-center">
        <div className="w-full h-20 md:h-28 px-4 md:px-9 flex justify-between items-center">
          <Title />
          <CategoryBar onLinkClick={closeMenu} />
          <OptionBar onLinkClick={closeMenu} />

          {/* 모바일 햄버거 메뉴 버튼 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="메뉴"
          >
            <svg
              className="w-6 h-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* 모바일 메뉴 드롭다운 */}
        {isMenuOpen && (
          <div className="md:hidden w-full bg-[#F5EDEC] border-t-2 border-[#E2D4C4] shadow-lg">
            <div className="flex flex-col p-4 space-y-2">
              {/* 카테고리 링크들 */}
              {categories.map((category, i) => (
                <Link
                  key={i}
                  href={category.href}
                  onClick={closeMenu}
                  className="text-lg font-bold py-3 px-4 rounded-lg hover:bg-black/10 transition-colors"
                >
                  {category.label}
                </Link>
              ))}

              {/* 구분선 */}
              <div className="border-t border-[#E2D4C4] my-2" />

              {/* 옵션 버튼들 */}
              {loading ? (
                <div className="py-3 px-4 flex justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                </div>
              ) : user ? (
                <>
                  <Link
                    href="/my-page"
                    onClick={closeMenu}
                    className="text-lg font-semibold py-3 px-4 rounded-lg hover:bg-black/10 transition-colors"
                  >
                    My Page
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-lg text-white font-semibold py-3 px-4 rounded-lg bg-[#FC712B] hover:brightness-75 transition-all"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth"
                    onClick={closeMenu}
                    className="text-lg font-semibold py-3 px-4 rounded-lg hover:bg-black/10 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    onClick={closeMenu}
                    className="text-lg text-white font-semibold py-3 px-4 rounded-lg bg-[#FC712B] hover:brightness-75 transition-all"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavBar;
